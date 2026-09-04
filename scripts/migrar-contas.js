/**
 * Cria as tabelas da área do cliente e liga os pedidos a ela.
 *
 *   npm run migrar-contas
 *
 * É seguro rodar mais de uma vez: tudo é verificado antes de criar.
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

async function colunaExiste(conn, tabela, coluna) {
  const [r] = await conn.query(
    'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [tabela, coluna]
  );
  return r[0].c > 0;
}

async function main() {
  lerEnv();
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  });
  console.log(`Banco: ${u.hostname}/${u.pathname.replace(/^\//, '')}\n`);

  // ---------- customers ----------
  await conn.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) DEFAULT '',
      document VARCHAR(50) DEFAULT '',
      password_hash VARCHAR(255) NOT NULL,
      email_verificado_em TIMESTAMP NULL DEFAULT NULL,
      aceita_marketing TINYINT(1) NOT NULL DEFAULT 0,
      aceita_marketing_em TIMESTAMP NULL DEFAULT NULL,
      ultimo_acesso_em TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  customers: pronta');

  // ---------- customer_addresses ----------
  await conn.query(`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      apelido VARCHAR(60) DEFAULT '',
      zip VARCHAR(20) NOT NULL,
      address VARCHAR(255) NOT NULL,
      number VARCHAR(30) DEFAULT '',
      complement VARCHAR(120) DEFAULT '',
      neighborhood VARCHAR(120) DEFAULT '',
      city VARCHAR(120) NOT NULL,
      state VARCHAR(2) NOT NULL,
      padrao TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('  customer_addresses: pronta');

  // ---------- orders.customer_id ----------
  if (await colunaExiste(conn, 'orders', 'customer_id')) {
    console.log('  orders.customer_id: ja existia');
  } else {
    // Aceita NULL de proposito: compra sem cadastro continua funcionando
    await conn.query('ALTER TABLE orders ADD COLUMN customer_id INT NULL DEFAULT NULL AFTER order_id');
    await conn.query('ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL');
    console.log('  orders.customer_id: criada');
  }

  for (const [nome, sql] of [
    ['idx_customers_email', 'CREATE INDEX idx_customers_email ON customers(email)'],
    ['idx_addresses_customer', 'CREATE INDEX idx_addresses_customer ON customer_addresses(customer_id)'],
    ['idx_orders_customer', 'CREATE INDEX idx_orders_customer ON orders(customer_id)'],
    ['idx_orders_email', 'CREATE INDEX idx_orders_email ON orders(customer_email)'],
  ]) {
    try { await conn.query(sql); console.log(`  indice ${nome}: criado`); }
    catch (e) { if (e.code === 'ER_DUP_KEYNAME') console.log(`  indice ${nome}: ja existia`); else throw e; }
  }

  // ---------- panorama ----------
  const [[{ c: totalClientes }]] = [await conn.query('SELECT COUNT(*) as c FROM customers').then(r => r[0])];
  const [orfaos] = await conn.query(
    'SELECT customer_email, COUNT(*) as pedidos FROM orders WHERE customer_id IS NULL GROUP BY customer_email'
  );
  console.log(`\n  contas cadastradas: ${totalClientes}`);
  console.log(`  e-mails com pedidos ainda sem dono: ${orfaos.length}`);
  orfaos.forEach(o => console.log(`     ${o.customer_email} — ${o.pedidos} pedido(s)`));
  console.log('\n  Esses pedidos sao adotados quando a pessoa se cadastrar E confirmar o e-mail.');

  await conn.end();
}

main().catch(e => { console.error('falhou:', e.message); process.exitCode = 1; });
