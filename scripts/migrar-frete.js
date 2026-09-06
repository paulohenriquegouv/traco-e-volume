/**
 * Prepara o banco para o frete: guarda o valor cobrado e a forma de entrega
 * escolhida em cada pedido.
 *
 *   npm run migrar-frete
 *
 * Seguro rodar mais de uma vez: tudo é verificado antes de criar.
 *
 * A tabela de preços em si não é criada aqui. Ela nasce zerada na primeira
 * leitura (padrão de src/lib/frete.js) e é preenchida em /admin/frete — de
 * propósito, para nenhuma loja começar cobrando um valor que ninguém escolheu.
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
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada (.env.local).');
    process.exit(1);
  }
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

  // A tabela settings guarda a configuração do frete. Em bancos antigos ela
  // pode não existir ainda.
  await conn.query(
    'CREATE TABLE IF NOT EXISTS settings (`key` VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ' +
    'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  );
  console.log('OK  settings');

  const colunas = [
    // O total já inclui o frete; guardar em separado é o que permite mostrar
    // "Subtotal + Frete" no pedido e conferir o que foi cobrado meses depois.
    ['shipping', 'DECIMAL(10,2) NOT NULL DEFAULT 0'],
    // retirada | entrega — como o pedido sai daqui.
    ['shipping_method', "VARCHAR(30) NOT NULL DEFAULT ''"],
  ];

  for (const [nome, tipo] of colunas) {
    if (await colunaExiste(conn, 'orders', nome)) {
      console.log(`--  orders.${nome} já existe`);
    } else {
      await conn.query(`ALTER TABLE orders ADD COLUMN ${nome} ${tipo}`);
      console.log(`OK  orders.${nome}`);
    }
  }

  // Pedidos anteriores ao frete saíram todos sem cobrança de entrega: marcar
  // como 'entrega' com valor zero mantém o histórico honesto (frete zero foi o
  // que o cliente pagou), em vez de deixar a coluna vazia.
  const [r] = await conn.query(
    "UPDATE orders SET shipping_method = 'entrega' WHERE shipping_method = ''"
  );
  console.log(`OK  ${r.affectedRows} pedido(s) antigo(s) marcados como entrega (frete 0)`);

  await conn.end();
  console.log('\nPronto. Defina os preços em /admin/frete.');
}

main().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
