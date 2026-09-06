/**
 * O que cada produto anuncia na vitrine.
 *
 * O card já mostra o desconto no canto esquerdo. Do lado direito cabe UM selo —
 * quatro etiquetas sobre a foto não destacam nada, só cobrem o produto. Então há
 * uma ordem de prioridade, e vence o motivo mais forte para olhar aquela peça:
 *
 *   1. Liquidação — é por tempo limitado, e o preço caiu agora.
 *   2. Novidade   — quem já conhece a loja quer ver o que entrou.
 *   3. Destaque   — a escolha da casa, que vale enquanto ninguém mexer.
 *
 * Um produto novo, em destaque e em liquidação mostra "Liquidação": o desconto
 * com prazo é o que faz a pessoa clicar hoje. Os outros dois continuam valendo
 * onde importam — o destaque na ordem da vitrine e na seção da página inicial.
 *
 * Funções puras, testáveis: `npm run teste-config`.
 */

const { alcanca } = require('./campanha');

/** Padrão de dias em que um produto ainda conta como novidade. */
const DIAS_NOVIDADE = 30;

/** Data de hoje em Belém, no formato AAAA-MM-DD. */
function hojeEmBelem() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Belem' });
}

/**
 * O produto entrou no catálogo há pouco?
 *
 * `dias` 0 desliga a regra — loja que não quer anunciar novidade nenhuma.
 */
function ehNovidade(produto, dias = DIAS_NOVIDADE, hoje = hojeEmBelem()) {
  const janela = Number(dias);
  if (!Number.isFinite(janela) || janela <= 0) return false;

  const criado = produto?.created_at;
  if (!criado) return false;

  const data = new Date(criado);
  if (Number.isNaN(data.getTime())) return false;

  // Comparação em dias inteiros: hora de cadastro não muda se algo é novidade.
  const diaCriado = data.toLocaleDateString('en-CA', { timeZone: 'America/Belem' });
  const diff = (new Date(`${hoje}T00:00:00Z`) - new Date(`${diaCriado}T00:00:00Z`)) / 86400000;
  return diff >= 0 && diff < janela;
}

/**
 * O selo a mostrar, ou null quando o produto não tem nada a anunciar.
 * @returns {{id: string, texto: string} | null}
 */
function seloDoProduto(produto, { campanha = null, diasNovidade = DIAS_NOVIDADE, hoje = hojeEmBelem() } = {}) {
  if (alcanca(produto, campanha, hoje)) return { id: 'liquidacao', texto: 'Liquidação' };
  if (ehNovidade(produto, diasNovidade, hoje)) return { id: 'novidade', texto: 'Novidade' };
  if (Number(produto?.featured) === 1) return { id: 'destaque', texto: 'Destaque' };
  return null;
}

module.exports = { DIAS_NOVIDADE, hojeEmBelem, ehNovidade, seloDoProduto };
