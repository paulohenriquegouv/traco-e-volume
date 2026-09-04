const { SignJWT, jwtVerify } = require('jose');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

/**
 * Sessão do cliente da loja.
 *
 * Usa a mesma base do admin (bcrypt + JWT + cookie HttpOnly), mas com cookie e
 * segredo próprios: uma sessão de cliente nunca pode virar sessão de admin, nem
 * o contrário. O sufixo no segredo garante que um token não vale no outro lado
 * mesmo que os cookies sejam trocados.
 */

const segredo = new TextEncoder().encode(
  (process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production') + ':cliente'
);

const COOKIE_CLIENTE = 'tv_cliente_token';
const VALIDADE = '30d'; // loja: sessão longa evita relogin a cada compra

async function criarTokenCliente(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(VALIDADE)
    .sign(segredo);
}

async function verificarTokenCliente(token) {
  try {
    const { payload } = await jwtVerify(token, segredo);
    return payload;
  } catch {
    return null;
  }
}

function cookieDeSessao(token) {
  const trintaDias = 60 * 60 * 24 * 30;
  return `${COOKIE_CLIENTE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${trintaDias}`;
}

function cookieDeSaida() {
  return `${COOKIE_CLIENTE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function tokenDaRequisicao(request) {
  const cru = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cru.split(';').map(p => {
      const i = p.indexOf('=');
      return i === -1 ? [p.trim(), ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }).filter(([k]) => k)
  );
  return cookies[COOKIE_CLIENTE] || null;
}

/** Devolve o cliente logado a partir do cookie, ou null. */
async function clienteAtual(request) {
  const token = tokenDaRequisicao(request);
  if (!token) return null;
  const payload = await verificarTokenCliente(token);
  if (!payload?.id) return null;

  const db = await getDb();
  const cliente = await db.prepare(
    'SELECT id, name, email, phone, document, email_verificado_em, aceita_marketing FROM customers WHERE id = ?'
  ).get(payload.id);
  return cliente || null;
}

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

/**
 * Regras de senha: comprimento acima de tudo. Exigir símbolo e maiúscula leva a
 * senha anotada em papel; 8 caracteres é o piso, e avisamos sobre as óbvias.
 */
function problemaNaSenha(senha) {
  const s = String(senha || '');
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/^\d+$/.test(s)) return 'A senha não pode ser só números.';
  const obvias = ['12345678', 'senha123', 'password', '11111111', 'tracovolume'];
  if (obvias.includes(s.toLowerCase())) return 'Essa senha é fácil demais de adivinhar. Escolha outra.';
  return null;
}

async function criarConta({ nome, email, senha, telefone, documento, aceitaMarketing }) {
  const db = await getDb();
  const emailLimpo = String(email || '').trim().toLowerCase();

  if (!String(nome || '').trim()) return { erro: 'Informe seu nome.' };
  if (!emailValido(emailLimpo)) return { erro: 'Informe um e-mail válido.' };
  const problema = problemaNaSenha(senha);
  if (problema) return { erro: problema };

  const existente = await db.prepare('SELECT id FROM customers WHERE email = ?').get(emailLimpo);
  if (existente) return { erro: 'Já existe uma conta com esse e-mail. Tente entrar.' };

  const hash = await bcrypt.hash(senha, 12);
  const agora = aceitaMarketing ? new Date() : null;

  await db.prepare(
    'INSERT INTO customers (name, email, phone, document, password_hash, aceita_marketing, aceita_marketing_em) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    String(nome).trim(), emailLimpo, String(telefone || '').trim(),
    String(documento || '').trim(), hash, aceitaMarketing ? 1 : 0, agora
  );

  const cliente = await db.prepare('SELECT id, name, email FROM customers WHERE email = ?').get(emailLimpo);
  return { cliente };
}

async function autenticar(email, senha) {
  const db = await getDb();
  const emailLimpo = String(email || '').trim().toLowerCase();
  const cliente = await db.prepare('SELECT * FROM customers WHERE email = ?').get(emailLimpo);

  // Mensagem única para e-mail inexistente e senha errada: dizer qual dos dois
  // falhou entrega a quem tenta invadir a informação de que o e-mail existe.
  const generico = { erro: 'E-mail ou senha incorretos.' };
  if (!cliente) return generico;

  const ok = await bcrypt.compare(String(senha || ''), cliente.password_hash);
  if (!ok) return generico;

  await db.prepare('UPDATE customers SET ultimo_acesso_em = NOW() WHERE id = ?').run(cliente.id);
  return { cliente: { id: cliente.id, name: cliente.name, email: cliente.email } };
}

/**
 * Liga a pedidos antigos feitos com o mesmo e-mail.
 *
 * Só roda com e-mail confirmado: sem isso, bastaria digitar o e-mail de outra
 * pessoa no cadastro para ver o histórico dela — com CPF e endereço junto.
 */
async function adotarPedidosAntigos(clienteId) {
  const db = await getDb();
  const cliente = await db.prepare('SELECT email, email_verificado_em FROM customers WHERE id = ?').get(clienteId);
  if (!cliente?.email_verificado_em) return { adotados: 0, motivo: 'e-mail ainda não confirmado' };

  const r = await db.prepare(
    'UPDATE orders SET customer_id = ? WHERE customer_id IS NULL AND LOWER(customer_email) = ?'
  ).run(clienteId, cliente.email.toLowerCase());
  return { adotados: r.changes || 0 };
}

module.exports = {
  COOKIE_CLIENTE,
  criarTokenCliente,
  verificarTokenCliente,
  cookieDeSessao,
  cookieDeSaida,
  tokenDaRequisicao,
  clienteAtual,
  criarConta,
  autenticar,
  adotarPedidosAntigos,
  problemaNaSenha,
  emailValido,
};
