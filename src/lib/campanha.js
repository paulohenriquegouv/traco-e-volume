/**
 * Liquidação: um desconto que vale para a loja toda por um período.
 *
 * A regra central: NADA é gravado no cadastro dos produtos. O desconto é uma
 * camada de cálculo por cima do preço, ligada por data. Por isso a liquidação
 * termina sozinha — quando a data de fim passa, os preços voltam ao normal sem
 * ninguém precisar desfazer produto por produto, e sem risco de sobrar um item
 * barato para sempre porque alguém esqueceu.
 *
 * O mesmo cálculo roda na vitrine e no servidor, na hora de cobrar. Mostrar
 * 20% de desconto e cobrar o preço cheio seria a pior forma de errar.
 *
 * Funções puras, testáveis sem banco: `npm run teste-config`.
 */

const PADRAO = {
  ativa: false,
  nome: 'Liquidação',
  // Percentual sobre o preço de venda. 0 não desconta nada.
  percentual: 0,
  // AAAA-MM-DD. Início vazio começa imediatamente; fim vazio não termina —
  // e liquidação sem fim é promoção permanente, que deixa de ser liquidação.
  inicio: '',
  fim: '',
  // Vazio limita a nada: a liquidação vale para o catálogo inteiro.
  categoria: '',
  // O que a faixa no topo do site diz. Vazio monta um texto com nome e desconto.
  texto: '',
};

/** Data de hoje em Belém, no formato AAAA-MM-DD. */
function hojeEmBelem() {
  // Sem o fuso, o servidor em UTC vira o dia às 21h de Belém e uma liquidação
  // que termina "hoje" morreria três horas antes para quem está aqui.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Belem' });
}

function texto(v, padrao = '') {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s || padrao;
}

/** Aceita AAAA-MM-DD e devolve '' para qualquer outra coisa. */
function data(v) {
  const s = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function mesclarCampanha(bruto) {
  const c = bruto && typeof bruto === 'object' ? bruto : {};
  const pct = Number(c.percentual);
  return {
    ativa: c.ativa === true || c.ativa === 'true',
    nome: texto(c.nome, PADRAO.nome),
    // Entre 0 e 90: acima disso é quase certamente um erro de digitação, e um
    // zero a mais viraria a loja inteira de graça.
    percentual: Number.isFinite(pct) ? Math.min(90, Math.max(0, Math.round(pct))) : 0,
    inicio: data(c.inicio),
    fim: data(c.fim),
    categoria: texto(c.categoria),
    texto: texto(c.texto),
  };
}

/**
 * A liquidação está valendo?
 *
 * `hoje` entra como parâmetro para o teste não depender do relógio.
 */
function vigente(campanha, hoje = hojeEmBelem()) {
  const c = mesclarCampanha(campanha);
  if (!c.ativa || c.percentual <= 0) return false;
  if (c.inicio && hoje < c.inicio) return false;
  if (c.fim && hoje > c.fim) return false;
  return true;
}

/** A liquidação alcança este produto? */
function alcanca(produto, campanha, hoje = hojeEmBelem()) {
  if (!vigente(campanha, hoje)) return false;
  const c = mesclarCampanha(campanha);
  if (!c.categoria) return true;
  return String(produto?.category || '').trim().toLowerCase() === c.categoria.toLowerCase();
}

/**
 * Preço final do produto, já com a liquidação.
 *
 * `preco_cheio` é o que aparece riscado: o preço comparativo do cadastro quando
 * existe (produto que já estava em promoção continua mostrando de quanto caiu),
 * senão o próprio preço de tabela.
 */
function precoDoProduto(produto, campanha, hoje = hojeEmBelem()) {
  const preco = Math.round(Number(produto?.price || 0) * 100) / 100;
  const comparativo = Number(produto?.compare_price || 0);
  const cheioCadastro = comparativo > preco ? Math.round(comparativo * 100) / 100 : 0;

  if (!alcanca(produto, campanha, hoje)) {
    return {
      preco,
      preco_cheio: cheioCadastro,
      em_liquidacao: false,
      percentual: 0,
    };
  }

  const c = mesclarCampanha(campanha);
  const comDesconto = Math.round(preco * (1 - c.percentual / 100) * 100) / 100;
  return {
    preco: comDesconto,
    // O riscado passa a ser o maior valor que a peça já custou nesta tela.
    preco_cheio: Math.max(cheioCadastro, preco),
    em_liquidacao: true,
    percentual: c.percentual,
  };
}

/** O que a faixa no topo do site anuncia. */
function textoDaFaixa(campanha) {
  const c = mesclarCampanha(campanha);
  if (c.texto) return c.texto;
  const onde = c.categoria ? ` em ${c.categoria}` : '';
  return `${c.nome}: ${c.percentual}% de desconto${onde}`;
}

module.exports = {
  PADRAO_CAMPANHA: PADRAO,
  hojeEmBelem,
  mesclarCampanha,
  vigente,
  alcanca,
  precoDoProduto,
  textoDaFaixa,
};
