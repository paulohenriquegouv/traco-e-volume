/**
 * Prepara o banco para a cotação de frete por volume: comprimento, largura e
 * altura do produto em números, não em texto livre.
 *
 *   npm run migrar-dimensoes
 *
 * Seguro rodar mais de uma vez: as colunas são verificadas antes de criar, e o
 * preenchimento só toca em produto que ainda está sem medida.
 *
 * O texto que já estava em `products.dimensions` é aproveitado quando dá para
 * lê-lo ("15x15x20 cm" vira 15, 15 e 20). O que não dá para ler fica como está,
 * e a lista sai no fim para você preencher à mão — chutar a medida de uma caixa
 * seria cobrar frete errado com cara de exatidão.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { lerTexto, formatar } = require('../src/lib/dimensoes');

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

  // Em centímetros, com uma casa decimal — milímetro de precisão basta para caixa.
  for (const nome of ['length_cm', 'width_cm', 'height_cm']) {
    if (await colunaExiste(conn, 'products', nome)) {
      console.log(`--  products.${nome} já existe`);
    } else {
      await conn.query(`ALTER TABLE products ADD COLUMN ${nome} DECIMAL(10,2) DEFAULT NULL`);
      console.log(`OK  products.${nome}`);
    }
  }

  const [produtos] = await conn.query(
    'SELECT id, name, dimensions FROM products WHERE length_cm IS NULL OR width_cm IS NULL OR height_cm IS NULL'
  );

  const semMedida = [];
  let convertidos = 0;

  for (const p of produtos) {
    const m = lerTexto(p.dimensions);
    if (!m) {
      semMedida.push(p);
      continue;
    }
    await conn.query(
      'UPDATE products SET length_cm = ?, width_cm = ?, height_cm = ?, dimensions = ? WHERE id = ?',
      [m.length_cm, m.width_cm, m.height_cm, formatar(m), p.id]
    );
    convertidos++;
  }

  console.log(`\nOK  ${convertidos} produto(s) com medida lida do texto que já estava cadastrado`);

  if (semMedida.length) {
    console.log(`\nATENÇÃO: ${semMedida.length} produto(s) ficaram sem medida — preencha em /admin/produtos:`);
    for (const p of semMedida) {
      console.log(`  #${p.id}  ${p.name}${p.dimensions ? `   (texto atual: "${p.dimensions}")` : '   (sem nada cadastrado)'}`);
    }
    console.log('\nProduto sem medida não entra na conta de volume: o frete dele sai só pelo peso.');
  }

  await conn.end();
  console.log('\nPronto.');
}

main().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
