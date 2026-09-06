/**
 * Confere o carrinho recebido do navegador contra o banco.
 *
 * Preço, nome e peso saem SEMPRE do banco. O navegador só diz *o quê* e
 * *quanto* — nunca *por quanto*. Sem isso, quem editasse o JSON da requisição
 * pagaria o preço que quisesse, e o frete grátis por valor mínimo cairia com um
 * subtotal fingido.
 *
 * O peso e o volume de cada item vêm junto porque são eles que definem a faixa de
 * frete: buscar tudo na mesma consulta evita uma segunda ida ao banco no meio do
 * checkout. Os totais do pedido não são somados aqui — quem soma é
 * `pesoParaFrete` (src/lib/frete.js), que sabe qual peso assumir para produto sem
 * peso cadastrado e quando o volume passa na frente da balança. Duas contas de
 * peso em lugares diferentes acabariam divergindo.
 */

const { volumeCm3 } = require('./dimensoes');

const MAX_ITENS = 50;
const MAX_QTD = 99;

/**
 * Aceita 3 e "3"; recusa 1.5, "1.5" e qualquer coisa que não seja inteiro.
 * Truncar valor quebrado seria pior que recusar: "quantidade 1.5" viraria 1
 * silenciosamente, e o cliente pagaria por algo diferente do que pediu.
 */
function inteiro(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : NaN;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v.trim());
  return NaN;
}

/**
 * @returns {{ok: true, itens: Array, subtotal: number} | {ok: false, erro: string}}
 */
async function conferirCarrinho(db, recebidos) {
  if (!Array.isArray(recebidos) || recebidos.length === 0) {
    return { ok: false, erro: 'Carrinho vazio' };
  }
  if (recebidos.length > MAX_ITENS) {
    return { ok: false, erro: 'Carrinho com itens demais.' };
  }

  // Junta repetições do mesmo produto antes de consultar: o carrinho da loja
  // não cria duplicatas, mas uma requisição montada à mão pode.
  const quantidades = new Map();
  for (const item of recebidos) {
    const id = inteiro(item?.product_id);
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, erro: 'Há um item sem produto válido no carrinho. Refaça o carrinho.' };
    }
    const qtd = inteiro(item?.quantity);
    if (!Number.isInteger(qtd) || qtd <= 0) {
      return { ok: false, erro: 'Quantidade inválida no carrinho.' };
    }
    const soma = (quantidades.get(id) || 0) + qtd;
    if (soma > MAX_QTD) {
      return { ok: false, erro: `Quantidade máxima por produto é ${MAX_QTD}.` };
    }
    quantidades.set(id, soma);
  }

  const ids = [...quantidades.keys()];
  const marcadores = ids.map(() => '?').join(', ');
  const produtos = await db
    .prepare(
      `SELECT id, name, price, weight, length_cm, width_cm, height_cm, embalagem_id, active ` +
      `FROM products WHERE id IN (${marcadores})`
    )
    .all(...ids);

  const porId = new Map((produtos || []).map(p => [Number(p.id), p]));

  const itens = [];
  let subtotal = 0;

  for (const [id, quantity] of quantidades) {
    const p = porId.get(id);
    if (!p) {
      return { ok: false, erro: 'Um produto do carrinho não existe mais. Refaça o carrinho.' };
    }
    if (Number(p.active) === 0) {
      return { ok: false, erro: `"${p.name}" saiu do catálogo. Remova-o do carrinho para continuar.` };
    }
    const price = Math.round(Number(p.price) * 100) / 100;
    const total = Math.round(price * quantity * 100) / 100;
    // weight fica nulo em produto sem peso cadastrado; quem decide o que fazer
    // com isso é o cálculo do frete (usa o peso padrão da configuração).
    const peso = Number(p.weight);
    itens.push({
      product_id: id,
      name: p.name,
      price,
      quantity,
      total,
      peso_g: Number.isFinite(peso) && peso > 0 ? peso : 0,
      // Zero em produto sem as três medidas: o frete cai para o peso, em vez de
      // inventar uma caixa que ninguém mediu.
      volume_cm3: volumeCm3(p),
      // Qual caixa este produto usa; o cálculo do frete resolve o resto. Vazio
      // significa "usa as medidas do próprio produto".
      embalagem_id: String(p.embalagem_id || ''),
    });
    subtotal = Math.round((subtotal + total) * 100) / 100;
  }

  return { ok: true, itens, subtotal };
}

module.exports = { conferirCarrinho, MAX_ITENS, MAX_QTD };
