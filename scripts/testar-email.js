/**
 * Testa o envio de e-mail: conexão, autenticação e uma mensagem real.
 *
 *   npm run testar-email                     -> envia para o próprio SMTP_USER
 *   npm run testar-email -- alguem@exemplo   -> envia para outro endereço
 *
 * Nenhum valor secreto é exibido.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

console.log('\n=== CONFIGURACAO (a senha nao e exibida) ===\n');
console.log('  servidor :', SMTP_HOST || '(ausente)');
console.log('  porta    :', SMTP_PORT || '(ausente)');
console.log('  usuario  :', SMTP_USER || '(ausente)');
console.log('  senha    :', SMTP_PASS ? `(${SMTP_PASS.length} caracteres)` : '(ausente)');
console.log('  remetente:', SMTP_FROM || '(usa o usuario)');

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.log('\nFaltam credenciais. Rode: .\\scripts\\configurar-email.ps1\n');
  process.exit(1);
}

const porta = Number(SMTP_PORT || 587);
const transporte = nodemailer.createTransport({
  host: SMTP_HOST,
  port: porta,
  secure: porta === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});

const destino = process.argv[2] || SMTP_USER;

(async () => {
  console.log('\n=== CONEXAO E LOGIN ===\n');
  try {
    await transporte.verify();
    console.log('  OK — servidor aceitou a conexao e a autenticacao');
  } catch (e) {
    console.log('  FALHOU:', e.message);
    console.log('\n=== O QUE COSTUMA SER ===\n');
    if (/auth/i.test(e.message)) console.log('  Usuario ou senha da caixa incorretos.');
    else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(e.message)) {
      console.log('  Sem resposta do servidor. Pode ser bloqueio da porta pela sua operadora.');
      console.log('  Em producao (Vercel) isso nao acontece — o teste local e que sofre.');
    } else if (/certificate/i.test(e.message)) console.log('  Problema de certificado TLS.');
    else console.log(' ', e.message);
    console.log('');
    process.exitCode = 1;
    return;
  }

  console.log('\n=== ENVIO REAL ===\n');
  console.log('  destino:', destino);
  try {
    const info = await transporte.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: destino,
      subject: 'Teste de envio — Traço & Volume',
      text: 'Se você está lendo isto, o envio de e-mail da loja está funcionando.',
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
        <p><strong>O envio de e-mail da loja está funcionando.</strong></p>
        <p style="color:#6b7280">Mensagem de teste enviada em ${new Date().toLocaleString('pt-BR')}.</p>
      </div>`,
    });
    console.log('  OK — mensagem aceita pelo servidor');
    console.log('  id:', info.messageId);
    console.log('\n  Confira a caixa de entrada (e o spam, na primeira vez).\n');
  } catch (e) {
    console.log('  FALHOU:', e.message, '\n');
    process.exitCode = 1;
  }
})();
