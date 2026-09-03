/**
 * Exporta o banco inteiro para um arquivo .sql portável.
 *
 *   npm run backup            -> backups/backup-AAAA-MM-DD-HHMM.sql
 *   npm run backup -- destino.sql
 *
 * Gera CREATE TABLE + INSERTs em SQL padrão, que roda em qualquer MySQL/MariaDB
 * (Locaweb, Railway, PlanetScale, um MySQL local). Não depende do mysqldump
 * instalado na máquina.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const TABELAS = ['admin_users', 'products', 'orders', 'order_items', 'settings'];

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
  };
}

// Escapa valores para SQL literal, preservando NULL, números e datas
function valorSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Date) {
    const iso = v.toISOString().slice(0, 19).replace('T', ' ');
    return `'${iso}'`;
  }
  if (Buffer.isBuffer(v)) return `0x${v.toString('hex')}`;
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

async function main() {
  lerEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL nao encontrada no .env.local');
    process.exitCode = 1;
    return;
  }

  const cfg = conexaoDaUrl(url);
  console.log(`Conectando em ${cfg.host}:${cfg.port}/${cfg.database} ...`);

  let conn;
  try {
    conn = await mysql.createConnection(cfg);
  } catch (e) {
    console.error('Nao consegui conectar:', e.code || e.message);
    console.error('Se o servico estiver desligado no painel, ligue antes de rodar o backup.');
    process.exitCode = 1;
    return;
  }

  // O servidor pode estar com ANSI_QUOTES (o Aiven esta): nesse modo o SHOW CREATE
  // TABLE devolve identificadores entre aspas duplas, que um MySQL padrao leria como
  // string e recusaria. Zerar o sql_mode da sessao garante um dump portavel.
  await conn.query("SET SESSION sql_mode = ''");

  const agora = new Date();
  const carimbo = agora.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const destino = process.argv[2] || path.join(__dirname, '..', 'backups', `backup-${carimbo}.sql`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  const partes = [
    '-- Backup do banco Traço & Volume',
    `-- Gerado em ${agora.toLocaleString('pt-BR')}`,
    `-- Origem: ${cfg.host}/${cfg.database}`,
    '',
    'SET NAMES utf8mb4;',
    "SET SESSION sql_mode = '';",
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  const resumo = [];

  for (const tabela of TABELAS) {
    let create;
    try {
      const [linhas] = await conn.query(`SHOW CREATE TABLE \`${tabela}\``);
      create = linhas[0]['Create Table'];
    } catch (e) {
      console.log(`  ${tabela}: nao existe, pulando`);
      continue;
    }

    partes.push(`-- ---------- ${tabela} ----------`);
    partes.push(`DROP TABLE IF EXISTS \`${tabela}\`;`);
    partes.push(create + ';');
    partes.push('');

    const [linhas] = await conn.query(`SELECT * FROM \`${tabela}\``);
    resumo.push(`${tabela}: ${linhas.length}`);

    if (linhas.length) {
      const colunas = Object.keys(linhas[0]);
      const nomes = colunas.map(c => `\`${c}\``).join(', ');
      // Um INSERT por linha: arquivo maior, porém legível e fácil de editar à mão
      for (const linha of linhas) {
        const valores = colunas.map(c => valorSql(linha[c])).join(', ');
        partes.push(`INSERT INTO \`${tabela}\` (${nomes}) VALUES (${valores});`);
      }
      partes.push('');
    }
    console.log(`  ${tabela}: ${linhas.length} registros`);
  }

  partes.push('SET FOREIGN_KEY_CHECKS = 1;');
  fs.writeFileSync(destino, partes.join('\n'), 'utf8');
  await conn.end();

  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(`\nBackup salvo: ${destino} (${kb} KB)`);
  console.log(`Conteudo: ${resumo.join(' | ')}`);
}

main();
