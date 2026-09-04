/**
 * Testa a DATABASE_URL do .env.local e diz o que esta errado, sem exibir a senha.
 *
 *   npm run testar-banco
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
const url = process.env.DATABASE_URL;

if (!url) {
  console.log('ERRO: DATABASE_URL nao encontrada no .env.local');
  process.exit(1);
}

let u;
try {
  u = new URL(url);
} catch {
  console.log('ERRO: a DATABASE_URL nao tem o formato esperado.');
  console.log('Esperado: mysql://USUARIO:SENHA@SERVIDOR:3306/BANCO');
  process.exit(1);
}

const usuario = decodeURIComponent(u.username);
const senha = decodeURIComponent(u.password);
const host = u.hostname;
const porta = u.port || '3306';
const banco = u.pathname.replace(/^\//, '');

console.log('\n=== COMO A STRING FOI INTERPRETADA ===\n');
console.log('  usuario :', usuario || '(vazio!)');
console.log('  senha   :', senha ? `(${senha.length} caracteres)` : '(vazia!)');
console.log('  servidor:', host || '(vazio!)');
console.log('  porta   :', porta);
console.log('  banco   :', banco || '(vazio!)');

const problemas = [];
if (!usuario) problemas.push('usuario vazio — falta o trecho entre mysql:// e os dois-pontos');
if (!senha) problemas.push('senha vazia — falta o trecho entre os dois-pontos e o @');
if (!host) problemas.push('servidor vazio — falta o trecho depois do @');
if (!banco) problemas.push('nome do banco vazio — falta o trecho depois da ultima barra');
// Verifica a forma BRUTA: se o especial estiver percent-encoded (%40 para @), esta ok
if (/[@:/#?]/.test(u.password)) {
  problemas.push('a senha tem caractere especial (@ : / # ?) sem codificacao, o que quebra a URL — codifique (@ vira %40) ou use so letras e numeros');
}

if (problemas.length) {
  console.log('\n=== PROBLEMAS ===\n');
  problemas.forEach(p => console.log('  -', p));
  console.log('\nModelo: mysql://USUARIO:SENHA@SERVIDOR:3306/BANCO\n');
  process.exit(1);
}

async function tentar(comSsl) {
  const conn = await mysql.createConnection({
    host, port: Number(porta), user: usuario, password: senha, database: banco,
    ...(comSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    connectTimeout: 15000,
  });
  const [v] = await conn.query('SELECT VERSION() as v');
  const [tabelas] = await conn.query('SHOW TABLES');
  await conn.end();
  return { versao: v[0].v, tabelas: tabelas.length };
}

(async () => {
  console.log('\n=== CONEXAO ===\n');
  for (const comSsl of [true, false]) {
    try {
      const r = await tentar(comSsl);
      console.log(`  OK — conectado ${comSsl ? 'COM' : 'SEM'} SSL`);
      console.log(`  MySQL ${r.versao} | ${r.tabelas} tabela(s) no banco`);
      console.log(r.tabelas === 0 ? '\n  Banco vazio: pronto para receber o backup.\n' : '\n  Banco ja tem tabelas.\n');
      return;
    } catch (e) {
      const msg = e.code || e.message;
      if (comSsl) { console.log(`  com SSL: falhou (${msg}) — tentando sem...`); continue; }
      console.log(`  sem SSL: falhou (${msg})`);
      console.log('\n=== O QUE COSTUMA SER ===\n');
      if (e.code === 'ER_ACCESS_DENIED_ERROR') console.log('  Usuario ou senha incorretos.');
      else if (e.code === 'ER_BAD_DB_ERROR') console.log('  O banco nao existe com esse nome — confira o final da URL.');
      else if (e.code === 'ENOTFOUND') console.log('  Servidor nao encontrado — confira o nome depois do @.');
      else if (e.code === 'ETIMEDOUT') console.log('  Sem resposta do servidor — pode ser bloqueio de acesso externo.');
      else console.log('  ', e.message);
      console.log('');
      process.exitCode = 1;
    }
  }
})();
