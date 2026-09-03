/**
 * Verifica se o webhook do Mercado Pago está configurado corretamente.
 * Rodar depois de cadastrar a URL no painel do MP: npm run verifica-webhook
 *
 * Não imprime nenhum valor secreto — só diagnóstico.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------- lê .env.local sem depender de dependência externa ----------
function lerEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  const env = {};
  if (!fs.existsSync(p)) return env;
  for (const linha of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = lerEnv();
const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || env.MERCADO_PAGO_ACCESS_TOKEN || '';
const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || env.MERCADO_PAGO_WEBHOOK_SECRET || '';
const publicKey = env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || '';
// Verifica a PRODUCAO por padrao (e la que o Mercado Pago bate).
// Para checar outro alvo: npm run verifica-webhook -- http://localhost:3000
const PRODUCAO = 'https://traco-e-volume.vercel.app';
const site = (process.argv[2] || PRODUCAO).replace(/\/$/, '');
const url = `${site}/api/webhooks/mercadopago`;

let problemas = 0;
const ok = (m) => console.log(`  OK    ${m}`);
const aviso = (m) => { console.log(`  AVISO ${m}`); };
const erro = (m) => { console.log(`  ERRO  ${m}`); problemas++; };

console.log('\n=== 1. CREDENCIAIS (nenhum valor e exibido) ===\n');

// Access token: produção = APP_USR-..., teste = TEST-...
if (!token) {
  erro('MERCADO_PAGO_ACCESS_TOKEN ausente');
} else if (/^(TEST|APP_USR)-0{6}/.test(token)) {
  erro(`MERCADO_PAGO_ACCESS_TOKEN ainda e o placeholder (${token.slice(0, 8)}...) — troque pelo real do painel`);
} else if (token.startsWith('APP_USR-')) {
  ok(`access token de PRODUCAO (${token.length} caracteres)`);
} else if (token.startsWith('TEST-')) {
  aviso(`access token de TESTE (${token.length} caracteres) — pagamentos nao sao reais`);
} else {
  erro('MERCADO_PAGO_ACCESS_TOKEN com formato inesperado (deveria comecar com APP_USR- ou TEST-)');
}

if (!publicKey) aviso('NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ausente (necessaria para pagamento com cartao)');
else if (/^(TEST|APP_USR)-0{6}/.test(publicKey)) erro('NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ainda e o placeholder');
else ok(`public key presente (${publicKey.length} caracteres)`);

// Token e public key precisam ser do mesmo ambiente
if (token && publicKey) {
  const amb = (v) => (v.startsWith('APP_USR-') ? 'producao' : v.startsWith('TEST-') ? 'teste' : '?');
  if (amb(token) !== amb(publicKey) && amb(token) !== '?' && amb(publicKey) !== '?') {
    erro(`access token (${amb(token)}) e public key (${amb(publicKey)}) sao de ambientes diferentes`);
  }
}

if (!secret) {
  aviso('MERCADO_PAGO_WEBHOOK_SECRET vazio — o webhook aceita chamadas sem validar assinatura');
} else {
  ok(`assinatura secreta presente (${secret.length} caracteres)`);
}

console.log(`\n=== 2. ROTA NO AR (${url}) ===\n`);

async function chamar(opts) {
  const r = await fetch(url, opts);
  const texto = await r.text();
  return { status: r.status, texto: texto.slice(0, 200) };
}

function assinar(dataId, requestId, ts) {
  return crypto.createHmac('sha256', secret)
    .update(`id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest('hex');
}

async function main() {
  // 2.1 — GET (é o que o painel do MP faz ao salvar a URL)
  try {
    const r = await chamar({ method: 'GET' });
    if (r.status === 200) ok('GET responde 200 (rota publicada)');
    else if (r.status === 404) erro('GET responde 404 — deploy sem a rota. Faca Redeploy na Vercel.');
    else erro(`GET respondeu ${r.status}: ${r.texto}`);
  } catch (e) {
    erro(`nao consegui alcancar ${url}: ${e.message}`);
    console.log('\nVerifique se o site esta no ar.\n');
    process.exitCode = 1;
    return;
  }

  // 2.2 — notificação irrelevante deve ser ignorada com 200
  try {
    const r = await chamar({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'merchant_order', data: { id: '1' } }),
    });
    if (r.status === 200) ok('notificacao de outro tipo e ignorada com 200');
    else erro(`esperava 200 para tipo irrelevante, veio ${r.status}`);
  } catch (e) { erro(`falha no POST: ${e.message}`); }

  console.log('\n=== 3. VALIDACAO DE ASSINATURA ===\n');

  if (!secret) {
    aviso('sem MERCADO_PAGO_WEBHOOK_SECRET local nao da para testar a assinatura');
    aviso('copie a assinatura secreta no painel do MP (Webhooks > Configurar notificacoes)');
  } else {
    const dataId = '1234567890';
    const requestId = 'verificacao-local';
    const ts = String(Math.floor(Date.now() / 1000));

    // 3.1 — assinatura forjada tem de ser recusada
    try {
      const r = await chamar({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `ts=${ts},v1=${'0'.repeat(64)}`,
          'x-request-id': requestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: dataId } }),
      });
      if (r.status === 401) ok('assinatura forjada e recusada com 401');
      else if (r.status === 200 || r.status === 500) erro(`assinatura forjada NAO foi recusada (veio ${r.status}) — o secret da Vercel nao confere com o local`);
      else erro(`esperava 401 para assinatura forjada, veio ${r.status}`);
    } catch (e) { erro(`falha no POST: ${e.message}`); }

    // 3.2 — assinatura correta tem de passar da validação
    try {
      const r = await chamar({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': `ts=${ts},v1=${assinar(dataId, requestId, ts)}`,
          'x-request-id': requestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: dataId } }),
      });
      if (r.status === 401) {
        erro('assinatura VALIDA foi recusada — o MERCADO_PAGO_WEBHOOK_SECRET da Vercel esta diferente do local');
      } else if (r.status === 200) {
        ok('assinatura valida aceita (pagamento de teste inexistente foi ignorado, como esperado)');
      } else if (r.status === 500) {
        aviso('assinatura aceita, mas a consulta ao MP falhou (500) — confira o MERCADO_PAGO_ACCESS_TOKEN na Vercel');
      } else {
        erro(`resposta inesperada ${r.status}: ${r.texto}`);
      }
    } catch (e) { erro(`falha no POST: ${e.message}`); }
  }

  console.log('');
  if (problemas === 0) {
    console.log('Tudo certo. Faca uma compra real de baixo valor no Pix para confirmar ponta a ponta.\n');
  } else {
    console.log(`${problemas} problema(s) encontrado(s) — veja os ERRO acima.\n`);
    process.exitCode = 1;
  }
}

main();
