/**
 * Restaura um backup .sql em qualquer MySQL/MariaDB.
 *
 *   npm run restaurar -- backups/backup-2026-09-03-21-41.sql
 *   npm run restaurar -- backup.sql "mysql://usuario:senha@host:3306/banco"
 *
 * Sem a URL no segundo argumento, usa a DATABASE_URL do .env.local — ou seja,
 * o destino é para onde o .env.local estiver apontando no momento.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function lerEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  for (const linha of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const chave = t.slice(0, i).trim();
    if (!process.env[chave]) process.env[chave] = t.slice(i + 1).trim();
  }
}

function conexaoDaUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  };
}

async function main() {
  lerEnv();

  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error('Informe o arquivo .sql:  npm run restaurar -- backups/backup-....sql');
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(arquivo)) {
    console.error('Arquivo nao encontrado:', arquivo);
    process.exitCode = 1;
    return;
  }

  const url = process.argv[3] || process.env.DATABASE_URL;
  if (!url) {
    console.error('Informe a URL de destino ou configure DATABASE_URL no .env.local');
    process.exitCode = 1;
    return;
  }

  const cfg = conexaoDaUrl(url);
  console.log(`Destino: ${cfg.host}:${cfg.port}/${cfg.database}`);
  console.log(`Arquivo: ${arquivo} (${(fs.statSync(arquivo).size / 1024).toFixed(1)} KB)`);
  console.log('\nATENCAO: as tabelas do destino serao substituidas (DROP TABLE IF EXISTS).');

  let conn;
  try {
    // Conecta sem database para poder cria-lo se ainda nao existir
    const semBanco = { ...cfg };
    delete semBanco.database;
    const tmp = await mysql.createConnection(semBanco);
    await tmp.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tmp.end();

    conn = await mysql.createConnection(cfg);
  } catch (e) {
    console.error('\nNao consegui conectar:', e.code || e.message);
    if (e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED') {
      console.error('Provavel bloqueio de acesso remoto: libere o IP desta maquina no painel do provedor.');
    }
    if (e.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Usuario ou senha incorretos, ou o usuario nao tem permissao vinda deste IP.');
    }
    process.exitCode = 1;
    return;
  }

  const sql = fs.readFileSync(arquivo, 'utf8');
  // Divide em comandos: o backup gera um comando por linha, sem ';' dentro de valores
  // que quebre a divisao (aspas sao escapadas na exportacao).
  const comandos = sql
    .split(/;\s*$/m)
    .map(c => c.trim())
    .filter(c => c && !c.startsWith('--'));

  let ok = 0;
  let falhas = 0;
  for (const cmd of comandos) {
    try {
      await conn.query(cmd);
      ok++;
    } catch (e) {
      falhas++;
      if (falhas <= 5) console.error('  falhou:', e.message.slice(0, 100), '->', cmd.slice(0, 70));
    }
  }

  console.log(`\n${ok} comandos aplicados, ${falhas} falharam.`);

  for (const t of ['admin_users', 'products', 'orders', 'order_items', 'settings']) {
    try {
      const [r] = await conn.query(`SELECT COUNT(*) as c FROM \`${t}\``);
      console.log(`  ${t}: ${r[0].c} registros`);
    } catch { console.log(`  ${t}: nao existe`); }
  }

  await conn.end();
  if (falhas) process.exitCode = 1;
  else console.log('\nRestauracao concluida. Aponte a DATABASE_URL para este banco e faca Redeploy.');
}

main();
