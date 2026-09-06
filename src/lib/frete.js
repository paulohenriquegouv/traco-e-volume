/**
 * Cálculo do frete.
 *
 * A tabela de preços NÃO fica no código: mora no banco, em `settings.frete`, e é
 * editada em /admin/frete. Aqui está só o formato da conta — base da região mais
 * um adicional por quilo que passar do peso base — e os padrões, que nascem
 * zerados de propósito. Loja recém-instalada cobra frete zero (o mesmo que fazia
 * antes desta funcionalidade existir) até alguém decidir os valores; assim
 * ninguém é cobrado por um número que o código inventou.
 *
 * `calcularOpcoes` é função pura para poder ser testada sem banco:
 * `npm run teste-frete`.
 */

// Agrupamento do IBGE. É o recorte que as transportadoras usam para tabelar preço.
const REGIOES = {
  norte: { nome: 'Norte', ufs: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'] },
  nordeste: { nome: 'Nordeste', ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
  centro_oeste: { nome: 'Centro-Oeste', ufs: ['DF', 'GO', 'MT', 'MS'] },
  sudeste: { nome: 'Sudeste', ufs: ['ES', 'MG', 'RJ', 'SP'] },
  sul: { nome: 'Sul', ufs: ['PR', 'RS', 'SC'] },
};

const UF_PARA_REGIAO = {};
for (const [chave, r] of Object.entries(REGIOES)) {
  for (const uf of r.ufs) UF_PARA_REGIAO[uf] = chave;
}

const CONFIG_PADRAO = {
  // Peso assumido para produto sem peso cadastrado (em gramas). Sem isto um
  // cadastro incompleto faria o pedido inteiro pesar zero e sair mais barato.
  peso_padrao_g: 300,
  // Até este peso o pedido paga só a base da região.
  peso_base_g: 500,
  // Subtotal a partir do qual a entrega sai de graça. 0 desliga a regra.
  gratis_acima: 0,
  retirada: {
    ativa: true,
    titulo: 'Retirar com a gente',
    endereco: '',
    prazo_dias: 2,
  },
  regioes: Object.fromEntries(
    Object.keys(REGIOES).map(k => [k, { base: 0, kg_extra: 0, prazo_dias: 0 }])
  ),
};

const CHAVE_SETTING = 'frete';

function numero(v, padrao = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
}

function dinheiro(v) {
  return Math.round(numero(v) * 100) / 100;
}

/**
 * Junta o que veio do banco com os padrões.
 *
 * Vale para configuração ausente, pela metade ou com região nova que o código
 * passou a conhecer depois: o que faltar cai no padrão em vez de virar NaN no
 * meio de uma soma de dinheiro.
 */
function mesclarConfig(bruto) {
  const c = bruto && typeof bruto === 'object' ? bruto : {};
  const retirada = c.retirada && typeof c.retirada === 'object' ? c.retirada : {};
  const regioes = c.regioes && typeof c.regioes === 'object' ? c.regioes : {};

  return {
    peso_padrao_g: numero(c.peso_padrao_g, CONFIG_PADRAO.peso_padrao_g),
    peso_base_g: numero(c.peso_base_g, CONFIG_PADRAO.peso_base_g),
    gratis_acima: dinheiro(c.gratis_acima),
    retirada: {
      ativa: retirada.ativa !== false,
      titulo: String(retirada.titulo || CONFIG_PADRAO.retirada.titulo),
      endereco: String(retirada.endereco || ''),
      prazo_dias: Math.round(numero(retirada.prazo_dias, CONFIG_PADRAO.retirada.prazo_dias)),
    },
    regioes: Object.fromEntries(
      Object.keys(REGIOES).map(k => {
        const r = regioes[k] && typeof regioes[k] === 'object' ? regioes[k] : {};
        return [k, {
          base: dinheiro(r.base),
          kg_extra: dinheiro(r.kg_extra),
          prazo_dias: Math.round(numero(r.prazo_dias)),
        }];
      })
    ),
  };
}

function regiaoDaUf(uf) {
  return UF_PARA_REGIAO[String(uf || '').trim().toUpperCase()] || null;
}

/** Soma o peso do carrinho. `itens`: [{ peso_g, quantity }] */
function pesoDoPedido(itens, config) {
  const c = mesclarConfig(config);
  return (itens || []).reduce((soma, i) => {
    const qtd = Math.max(1, Math.round(numero(i.quantity, 1)));
    const peso = numero(i.peso_g, 0) || c.peso_padrao_g;
    return soma + peso * qtd;
  }, 0);
}

/**
 * Preço da entrega para uma região.
 * Cada quilo (ou fração) acima do peso base soma o adicional da região.
 */
function precoDaEntrega(config, chaveRegiao, pesoG) {
  const c = mesclarConfig(config);
  const r = c.regioes[chaveRegiao];
  if (!r) return null;
  const excedente = Math.max(0, numero(pesoG) - c.peso_base_g);
  const quilosExtras = Math.ceil(excedente / 1000);
  return dinheiro(r.base + r.kg_extra * quilosExtras);
}

/**
 * Monta as opções de entrega oferecidas ao cliente.
 *
 * Sem UF ainda (cliente não digitou o CEP) devolve só a retirada, com
 * `precisa_uf` ligado — a tela usa isso para pedir o CEP em vez de fingir que
 * o frete é zero.
 */
function calcularOpcoes({ config, uf, subtotal = 0, peso_g = 0 }) {
  const c = mesclarConfig(config);
  const opcoes = [];

  if (c.retirada.ativa) {
    opcoes.push({
      id: 'retirada',
      nome: c.retirada.titulo,
      preco: 0,
      prazo_dias: c.retirada.prazo_dias,
      detalhe: c.retirada.endereco,
      gratis: true,
    });
  }

  const chave = regiaoDaUf(uf);
  if (chave) {
    const cheio = precoDaEntrega(c, chave, peso_g);
    const gratisPorValor = c.gratis_acima > 0 && dinheiro(subtotal) >= c.gratis_acima;
    opcoes.push({
      id: 'entrega',
      nome: 'Entrega no endereço',
      preco: gratisPorValor ? 0 : cheio,
      preco_cheio: cheio,
      prazo_dias: c.regioes[chave].prazo_dias,
      detalhe: REGIOES[chave].nome,
      regiao: chave,
      gratis: gratisPorValor || cheio === 0,
    });
  }

  return {
    opcoes,
    peso_g: Math.round(numero(peso_g)),
    precisa_uf: !chave,
    gratis_acima: c.gratis_acima,
    // Quanto falta para a entrega sair de graça — a tela transforma isso em
    // "faltam R$ X para o frete grátis".
    falta_para_gratis: c.gratis_acima > 0
      ? Math.max(0, dinheiro(c.gratis_acima - dinheiro(subtotal)))
      : 0,
  };
}

/**
 * Preço definitivo de uma opção — o que o checkout cobra.
 *
 * Nunca aceita o valor que o navegador mandou: recalcula pelo id escolhido.
 * Opção desconhecida (ou entrega sem UF) devolve null, e o checkout recusa o
 * pedido em vez de cobrar um frete inventado.
 */
function precoDaOpcao({ config, id, uf, subtotal = 0, peso_g = 0 }) {
  const { opcoes } = calcularOpcoes({ config, uf, subtotal, peso_g });
  const escolhida = opcoes.find(o => o.id === id);
  return escolhida ? escolhida.preco : null;
}

async function lerConfig(db) {
  try {
    const linha = await db.prepare('SELECT value FROM settings WHERE `key` = ?').get(CHAVE_SETTING);
    return mesclarConfig(linha ? JSON.parse(linha.value) : null);
  } catch {
    // Tabela ausente ou JSON corrompido não pode derrubar o checkout: com o
    // padrão a loja segue vendendo com frete zero.
    return mesclarConfig(null);
  }
}

async function salvarConfig(db, bruto) {
  const cfg = mesclarConfig(bruto);
  await db.prepare(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)'
  ).run(CHAVE_SETTING, JSON.stringify(cfg));
  return cfg;
}

module.exports = {
  REGIOES,
  CONFIG_PADRAO,
  CHAVE_SETTING,
  mesclarConfig,
  regiaoDaUf,
  pesoDoPedido,
  precoDaEntrega,
  calcularOpcoes,
  precoDaOpcao,
  lerConfig,
  salvarConfig,
};
