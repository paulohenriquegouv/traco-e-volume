/**
 * Reenvia o link de confirmação de e-mail para um cliente.
 *
 * Serve para quem se cadastrou antes de a fase 2 existir e por isso nunca
 * recebeu o link. Sem confirmar, a pessoa não recupera senha nem vê os pedidos
 * feitos antes da conta.
 *
 *   npm run reenviar-verificacao -- cliente@exemplo.com
 *
 * O link vai apontar para NEXT_PUBLIC_SITE_URL. Como o .env.local costuma
 * apontar para o localhost do desenvolvimento, passe o endereço público:
 *
 *   SITE_URL=https://tracoevolume.com.br npm run reenviar-verificacao -- cliente@exemplo.com
 */
const fs = require('fs');
const path = require('path');

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
lerEnv();

// SITE_URL tem a última palavra: o link vai para a caixa de uma pessoa real e
// não pode apontar para o localhost da máquina de desenvolvimento.
if (process.env.SITE_URL) process.env.NEXT_PUBLIC_SITE_URL = process.env.SITE_URL;

const destino = process.argv[2];
const endereco = process.env.NEXT_PUBLIC_SITE_URL || '';

if (!destino) {
  console.log('\n  uso: npm run reenviar-verificacao -- cliente@exemplo.com\n');
  process.exit(1);
}
if (/localhost|127\.0\.0\.1/.test(endereco)) {
  console.log(`\n  RECUSADO: o link apontaria para ${endereco}, que só existe nesta máquina.`);
  console.log('  Rode de novo passando o endereço público:\n');
  console.log(`    SITE_URL=https://tracoevolume.com.br npm run reenviar-verificacao -- ${destino}\n`);
  process.exit(1);
}

const { getDb } = require('../src/lib/db');
const { enviarVerificacao } = require('../src/lib/fluxos-email');
const { smtpConfigurado } = require('../src/lib/email');

(async () => {
  if (!smtpConfigurado()) {
    console.log('\n  SMTP não configurado no .env.local (SMTP_HOST, SMTP_USER, SMTP_PASS).\n');
    process.exit(1);
  }

  const db = await getDb();
  const cliente = await db.prepare(
    'SELECT id, name, email, email_verificado_em FROM customers WHERE email = ?'
  ).get(String(destino).trim().toLowerCase());

  if (!cliente) {
    console.log(`\n  nenhuma conta com o e-mail ${destino}\n`);
    process.exit(1);
  }
  if (cliente.email_verificado_em) {
    console.log(`\n  #${cliente.id} ${cliente.email} já está confirmado em ${cliente.email_verificado_em} — nada a fazer.\n`);
    process.exit(0);
  }

  console.log(`\n  conta: #${cliente.id} ${cliente.email} (${cliente.name})`);
  console.log(`  link vai apontar para: ${endereco}`);

  await enviarVerificacao(cliente);

  // Aqui, ao contrário da Vercel, o processo é nosso: só sai quando o envio
  // terminar, senão o script mataria o SMTP no meio.
  await new Promise(r => setTimeout(r, 20000));
  console.log('\n  pronto — o link vale por 7 dias.\n');
  process.exit(0);
})().catch(e => { console.error('\n  erro:', e.message, '\n'); process.exit(1); });
