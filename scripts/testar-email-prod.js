/**
 * Confere, contra o site publicado, se o pedido de recuperacao de senha cria o
 * token no banco. E o teste que pega a falha que so aparece em producao: na
 * Vercel a funcao morre ao responder e o trabalho disparado sem espera some.
 *
 *   node scripts/testar-email-prod.js [email]
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
lerEnv();

const SITE = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://traco-e-volume.vercel.app').replace(/\/$/, '');
const EMAIL = process.argv[2] || 'loja@tracoevolume.com.br';
const espera = ms => new Promise(r => setTimeout(r, ms));

function conectar() {
  const u = new URL(process.env.DATABASE_URL);
  return mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 15000,
  });
}

(async () => {
  const cx = await conectar();

  const [contas] = await cx.query('SELECT id, email FROM customers WHERE email = ?', [EMAIL]);
  if (!contas.length) {
    console.log(`\n  conta nao existe: ${EMAIL}\n`);
    await cx.end();
    return;
  }
  const conta = contas[0];
  console.log(`\n=== ${SITE} ===\n`);
  console.log(`  conta: #${conta.id} ${conta.email}`);

  const [limpeza] = await cx.query(
    'DELETE FROM customer_tokens WHERE customer_id = ? AND tipo = ?', [conta.id, 'senha']
  );
  console.log(`  tokens de senha antigos removidos: ${limpeza.affectedRows}`);

  const r = await fetch(`${SITE}/api/conta/senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL }),
  });
  const corpo = await r.json().catch(() => ({}));
  console.log(`  pedido enviado: HTTP ${r.status} — ${corpo.mensagem || '(sem mensagem)'}\n`);

  for (const s of [2, 5, 10]) {
    await espera(s * 1000);
    const [linhas] = await cx.query(
      'SELECT tipo, expira_em FROM customer_tokens WHERE customer_id = ? ORDER BY id DESC', [conta.id]
    );
    console.log(`  +${s}s: tokens = ${linhas.map(l => l.tipo).join(', ') || '(nenhum)'}`);
    const senha = linhas.find(l => l.tipo === 'senha');
    if (senha) {
      console.log(`\n  OK — token de senha criado, vale ate ${senha.expira_em}\n`);
      await cx.end();
      return;
    }
  }

  console.log('\n  FALHOU — nenhum token de senha depois de 17s\n');
  await cx.end();
  process.exitCode = 1;
})().catch(e => { console.error('\n  erro:', e.message, '\n'); process.exit(1); });
