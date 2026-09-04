/**
 * Cria a tabela de tokens de e-mail (recuperação de senha e verificação).
 *
 *   npm run migrar-tokens
 *
 * Seguro rodar mais de uma vez.
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

async function main() {
  lerEnv();
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname, port: Number(u.port || 3306),
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''), ssl: { rejectUnauthorized: false },
  });

  // Guarda só o HASH do token: se o banco vazar, os links em trânsito continuam
  // inúteis para quem os ler.
  await conn.query(`
    CREATE TABLE IF NOT EXISTS customer_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      tipo VARCHAR(20) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expira_em TIMESTAMP NOT NULL,
      usado_em TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  customer_tokens: pronta');

  for (const [nome, sql] of [
    ['idx_tokens_hash', 'CREATE INDEX idx_tokens_hash ON customer_tokens(token_hash)'],
    ['idx_tokens_cliente', 'CREATE INDEX idx_tokens_cliente ON customer_tokens(customer_id, tipo)'],
  ]) {
    try { await conn.query(sql); console.log(`  indice ${nome}: criado`); }
    catch (e) { if (e.code === 'ER_DUP_KEYNAME') console.log(`  indice ${nome}: ja existia`); else throw e; }
  }

  // Marca se o pedido ja teve e-mail de confirmacao enviado, para o reenvio da
  // notificacao do Mercado Pago nao gerar e-mail repetido.
  const [col] = await conn.query(
    "SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'email_confirmacao_em'"
  );
  if (col[0].c > 0) {
    console.log('  orders.email_confirmacao_em: ja existia');
  } else {
    await conn.query('ALTER TABLE orders ADD COLUMN email_confirmacao_em TIMESTAMP NULL DEFAULT NULL');
    console.log('  orders.email_confirmacao_em: criada');
  }

  await conn.end();
  console.log('\n  pronto.');
}

main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
