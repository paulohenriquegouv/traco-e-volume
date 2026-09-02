/**
 * Script de inicialização do banco de dados
 * Cria as tabelas e insere o admin inicial
 * Uso: node scripts/init-db.js
 */
// Carrega variáveis do .env.local manualmente
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIdx).trim();
      let value = trimmed.substring(eqIdx + 1).trim();
      if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}
const { getDb, closeDb } = require('../src/lib/db');
const { seedAdmin } = require('../src/lib/auth');

async function init() {
  console.log('🚀 Inicializando banco de dados da Traço & Volume...\n');

  // Inicializa DB (cria tabelas automaticamente)
  const db = await getDb();
  console.log('✅ Tabelas criadas/verificadas com sucesso.');

  // Cria admin inicial
  await seedAdmin();

  // Verifica o estado
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

  console.log(`\n📊 Status:`);
  console.log(`   - Produtos cadastrados: ${productCount}`);
  console.log(`   - Pedidos registrados: ${orderCount}`);
  console.log(`   - Admin: configurado`);

  await closeDb();
  console.log('\n✅ Banco de dados pronto! Execute "npm run dev" para iniciar a loja.');
}

init().catch(err => {
  console.error('❌ Erro na inicialização:', err);
  process.exit(1);
});
