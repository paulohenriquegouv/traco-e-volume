/**
 * Dimensões do produto: os três números, e o texto que se mostra ao cliente.
 *
 * Até aqui a loja guardava só `products.dimensions`, texto livre ("15x15x20 cm").
 * Serve para ler, não para calcular: nenhuma transportadora aceita uma frase.
 * Cotação de frete pede comprimento, largura e altura separados — e é o volume,
 * não o peso, que manda no preço de peça impressa em 3D.
 *
 * Agora os números moram em `length_cm`, `width_cm` e `height_cm`, e o texto
 * passa a ser derivado deles. O campo de texto continua existindo para os
 * cadastros antigos que ninguém converteu ainda ("aprox. 10 cm", "tamanho A5") —
 * quando os três números existem, quem manda são eles.
 *
 * Funções puras, testáveis sem banco: `npm run teste-frete`.
 */

/** Aceita 15, "15", "15,5" e "15.5"; recusa o resto. Devolve null, nunca NaN. */
function numeroCm(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  // Milímetro de precisão basta; o resto é ruído de digitação.
  return Math.round(n * 10) / 10;
}

/**
 * Extrai os três números de um texto livre.
 *
 * Cobre "15x15x20 cm", "15 x 15 x 20", "15X15X20cm" e "10,5x8x3". Qualquer coisa
 * fora disso devolve null — melhor não adivinhar a medida de uma caixa.
 */
function lerTexto(texto) {
  const t = String(texto || '').trim();
  if (!t) return null;
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  const [c, l, a] = [numeroCm(m[1]), numeroCm(m[2]), numeroCm(m[3])];
  return c && l && a ? { length_cm: c, width_cm: l, height_cm: a } : null;
}

/** Os três números, ou null se faltar algum. Meia medida não serve para cotar. */
function medidas(produto) {
  const c = numeroCm(produto?.length_cm);
  const l = numeroCm(produto?.width_cm);
  const a = numeroCm(produto?.height_cm);
  return c && l && a ? { length_cm: c, width_cm: l, height_cm: a } : null;
}

/** Volume em cm³, ou 0 quando não há as três medidas. */
function volumeCm3(produto) {
  const m = medidas(produto);
  return m ? Math.round(m.length_cm * m.width_cm * m.height_cm) : 0;
}

/** "15 x 15 x 20 cm" — o que aparece na ficha do produto. */
function formatar(produto) {
  const m = medidas(produto);
  if (!m) return '';
  const n = (v) => String(v).replace('.', ',');
  return `${n(m.length_cm)} x ${n(m.width_cm)} x ${n(m.height_cm)} cm`;
}

/**
 * Texto a gravar em `dimensions`.
 *
 * Com os três números, o texto é derivado deles — uma fonte só, sem chance de a
 * ficha dizer 15x15x20 enquanto o frete calcula outra coisa. Sem eles, preserva
 * o que o cadastro já tinha escrito.
 */
function textoParaGravar(produto, textoAtual = '') {
  return formatar(produto) || String(textoAtual || '');
}

module.exports = {
  numeroCm,
  lerTexto,
  medidas,
  volumeCm3,
  formatar,
  textoParaGravar,
};
