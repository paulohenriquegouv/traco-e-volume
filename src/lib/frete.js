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
  // Cubagem: quantos cm³ equivalem a 1 kg. Transportadora cobra pelo espaço
  // ocupado quando o pacote é grande e leve — que é o caso de quase toda peça
  // impressa em 3D. 6000 é o divisor usual das encomendas; 0 desliga a regra.
  //
  // Nasce ZERADO como o resto da tabela: até alguém decidir, o frete sai só pelo
  // peso, exatamente como saía antes desta conta existir.
  divisor_cubagem: 0,
  // Volume a partir do qual a cubagem passa a valer (cm³). Existe porque
  // transportadora costuma cubar só pacote grande — caixa pequena paga pelo peso
  // mesmo sendo leve. 0 aplica a cubagem a qualquer volume.
  cubagem_minima_cm3: 0,
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
  // Caixas que a loja usa de verdade. O que a transportadora mede é a caixa, não
  // a peça: um vaso de 12 cm dentro de uma caixa de 20 cm viaja como 20 cm.
  //
  // Cada item é { id, nome, length_cm, width_cm, height_cm, peso_g }, com peso_g
  // sendo o peso da caixa VAZIA — papelão e plástico-bolha pesam, e esquecer
  // disso é subcobrar em todo pedido.
  //
  // Nasce vazia: sem caixa cadastrada, o frete usa as medidas do próprio
  // produto, que é como funcionava antes.
  embalagens: [],
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
 * Limpa a lista de caixas vinda do banco (ou do formulário).
 *
 * Linha sem nome ou sem as três medidas é descartada em vez de virar uma caixa
 * de volume zero: caixa pela metade cobraria frete errado calada. O id é o que
 * o produto guarda, então nunca é inventado aqui — linha sem id ganha um a
 * partir do nome, e id repetido perde a segunda ocorrência.
 */
function normalizarEmbalagens(bruto) {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set();
  const saida = [];
  for (const e of bruto) {
    if (!e || typeof e !== 'object') continue;
    const nome = String(e.nome || '').trim();
    const c = numero(e.length_cm), l = numero(e.width_cm), a = numero(e.height_cm);
    if (!nome || !(c > 0) || !(l > 0) || !(a > 0)) continue;
    const id = String(e.id || '').trim() || nome
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // "Média" -> "Media", nao "M-dia"
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    saida.push({
      id,
      nome,
      length_cm: Math.round(c * 10) / 10,
      width_cm: Math.round(l * 10) / 10,
      height_cm: Math.round(a * 10) / 10,
      peso_g: Math.round(numero(e.peso_g)),
    });
  }
  return saida;
}

/** A caixa escolhida no cadastro do produto, ou null quando não há. */
function embalagemDoItem(item, config) {
  const id = String(item?.embalagem_id || '').trim();
  if (!id) return null;
  return mesclarConfig(config).embalagens.find(e => e.id === id) || null;
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
    divisor_cubagem: numero(c.divisor_cubagem),
    cubagem_minima_cm3: numero(c.cubagem_minima_cm3),
    gratis_acima: dinheiro(c.gratis_acima),
    retirada: {
      ativa: retirada.ativa !== false,
      titulo: String(retirada.titulo || CONFIG_PADRAO.retirada.titulo),
      endereco: String(retirada.endereco || ''),
      prazo_dias: Math.round(numero(retirada.prazo_dias, CONFIG_PADRAO.retirada.prazo_dias)),
    },
    embalagens: normalizarEmbalagens(c.embalagens),
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

/**
 * Soma o peso do carrinho. `itens`: [{ peso_g, embalagem_id, quantity }]
 *
 * A caixa vazia entra no peso: papelão e plástico-bolha pesam, e esquecer disso
 * subcobra em todo pedido.
 */
function pesoDoPedido(itens, config) {
  const c = mesclarConfig(config);
  return (itens || []).reduce((soma, i) => {
    const qtd = Math.max(1, Math.round(numero(i.quantity, 1)));
    const peso = numero(i.peso_g, 0) || c.peso_padrao_g;
    const caixa = embalagemDoItem(i, c);
    return soma + (peso + (caixa ? caixa.peso_g : 0)) * qtd;
  }, 0);
}

/**
 * Soma o volume do carrinho, em cm³.
 *
 * Vale a caixa escolhida no cadastro do produto — é ela que a transportadora
 * mede, não a peça: um vaso de 12 cm dentro de uma caixa de 20 cm viaja como
 * 20 cm. Sem caixa, valem as medidas do próprio produto; sem nenhuma das duas,
 * zero, e o pedido é cobrado pelo peso.
 *
 * Cada unidade conta uma caixa. Duas peças costumam viajar numa caixa só, mas
 * juntar peças em caixas é problema de arrumação, não de conta: chutar que cabem
 * juntas cobraria menos do que a transportadora vai cobrar da loja.
 */
function volumeDoPedido(itens, config) {
  const c = mesclarConfig(config);
  return (itens || []).reduce((soma, i) => {
    const qtd = Math.max(1, Math.round(numero(i.quantity, 1)));
    const caixa = embalagemDoItem(i, c);
    const volume = caixa
      ? caixa.length_cm * caixa.width_cm * caixa.height_cm
      : numero(i.volume_cm3, 0);
    return soma + volume * qtd;
  }, 0);
}

/**
 * Peso que o volume representa, em gramas.
 *
 * Uma caixa de 30x25x20 dá 15.000 cm³: com divisor 6000, "pesa" 2,5 kg ainda que
 * a peça dentro marque 400 g na balança. É por isso que tabela só por peso
 * subcobra peça 3D — leve e volumosa é o normal aqui.
 */
function pesoCubado(volumeCm3, config) {
  const c = mesclarConfig(config);
  if (!(c.divisor_cubagem > 0)) return 0;
  const v = numero(volumeCm3);
  if (v <= 0 || v < c.cubagem_minima_cm3) return 0;
  return Math.round((v / c.divisor_cubagem) * 1000);
}

/**
 * O peso que vale para cobrar: o maior entre o da balança e o do espaço ocupado.
 *
 * Com a cubagem desligada (divisor 0, o padrão) devolve o peso real e nada muda.
 * Produto sem medida cadastrada não atrapalha: entra com volume zero e o pedido
 * é cobrado pelo peso, como antes.
 */
function pesoParaFrete(itens, config) {
  return Math.max(
    pesoDoPedido(itens, config),
    pesoCubado(volumeDoPedido(itens, config), config)
  );
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
  volumeDoPedido,
  normalizarEmbalagens,
  embalagemDoItem,
  pesoCubado,
  pesoParaFrete,
  precoDaEntrega,
  calcularOpcoes,
  precoDaOpcao,
  lerConfig,
  salvarConfig,
};
