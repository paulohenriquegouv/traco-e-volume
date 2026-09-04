const crypto = require('crypto');
const { getDb } = require('./db');

/**
 * Tokens de uso único enviados por e-mail.
 *
 * O banco guarda apenas o hash SHA-256. Se o banco vazar, os links que já
 * circularam continuam inúteis — o token cru só existe no e-mail do cliente.
 */

const VALIDADE = {
  senha: 60 * 60 * 1000,          // 1 hora: janela curta para um link poderoso
  verificacao: 7 * 24 * 60 * 60 * 1000, // 7 dias: confirmar e-mail não tem pressa
};

const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function criarToken(clienteId, tipo) {
  const db = await getDb();

  // Um pedido novo invalida os anteriores do mesmo tipo: dois links de
  // redefinição válidos ao mesmo tempo dobram a superfície de ataque.
  await db.prepare(
    'UPDATE customer_tokens SET usado_em = NOW() WHERE customer_id = ? AND tipo = ? AND usado_em IS NULL'
  ).run(clienteId, tipo);

  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + (VALIDADE[tipo] || VALIDADE.senha));

  await db.prepare(
    'INSERT INTO customer_tokens (customer_id, tipo, token_hash, expira_em) VALUES (?, ?, ?, ?)'
  ).run(clienteId, tipo, hashDe(token), expira);

  return token;
}

/** Confere sem consumir — para a tela decidir se mostra o formulário. */
async function conferirToken(token, tipo) {
  if (!token || typeof token !== 'string') return null;
  const db = await getDb();
  const registro = await db.prepare(
    `SELECT t.*, c.email, c.name FROM customer_tokens t
     JOIN customers c ON c.id = t.customer_id
     WHERE t.token_hash = ? AND t.tipo = ? AND t.usado_em IS NULL AND t.expira_em > NOW()`
  ).get(hashDe(token), tipo);
  return registro || null;
}

/**
 * Consome o token. O UPDATE condicional garante que duas requisições
 * simultâneas com o mesmo link não sejam ambas aceitas.
 */
async function consumirToken(token, tipo) {
  const registro = await conferirToken(token, tipo);
  if (!registro) return null;

  const db = await getDb();
  const r = await db.prepare(
    'UPDATE customer_tokens SET usado_em = NOW() WHERE id = ? AND usado_em IS NULL'
  ).run(registro.id);

  if (!r.changes) return null; // outra requisição chegou primeiro
  return registro;
}

module.exports = { criarToken, conferirToken, consumirToken };
