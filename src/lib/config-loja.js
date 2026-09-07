/**
 * Parâmetros da loja — o que se muda sem mexer no código.
 *
 * Mora em `settings`, a mesma tabela do frete, e é editado em
 * /admin/configuracoes. Cada bloco tem sua chave (`loja`, `vitrine`,
 * `pagamento`, `prazos`) para uma tela não sobrescrever o que a outra salvou.
 *
 * TODO PADRÃO É O QUE JÁ ESTAVA NO CÓDIGO. Loja que nunca abriu esta tela
 * continua exatamente como era — nada muda de aparência ou de regra só porque a
 * parametrização passou a existir. O que estiver em branco no banco cai no
 * padrão, em vez de virar uma página com buracos.
 *
 * Funções puras separadas do banco para poderem ser testadas:
 * `npm run teste-config`.
 */

const { PADRAO_CAMPANHA, mesclarCampanha } = require('./campanha');

const PADRAO = {
  // A liquidacao mora aqui junto com o resto porque e editada na mesma tela; a
  // conta em si fica em campanha.js, que a vitrine e o checkout tambem usam.
  campanha: PADRAO_CAMPANHA,
  loja: {
    nome: 'Traço & Volume',
    email: '',
    whatsapp: '',
    cidade_origem: '',
    uf_origem: '',
  },
  vitrine: {
    selo: 'Impressão 3D de Qualidade',
    titulo: 'Traço & Volume',
    subtitulo:
      'Peças exclusivas em impressão 3D com acabamento profissional. Do protótipo à produção, transformamos suas ideias em realidade.',
    botao_produtos: 'Ver Produtos',
    botao_contato: 'Fale Conosco',
    titulo_categorias: 'Categorias',
    titulo_destaques: 'Produtos em Destaque',
    // Por quantos dias um produto recem-cadastrado leva o selo de novidade.
    // 0 desliga o selo.
    dias_novidade: 30,
  },
  links: {
    // Em branco, o título da página usa o nome da loja.
    titulo: '',
    subtitulo: 'Peças exclusivas em impressão 3D',
    // A página do link da bio nunca abre vazia: sem nada salvo, estes botões
    // aparecem. WhatsApp e Instagram entram pelos mesmos endereços que o site
    // inteiro já usa.
    itens: [
      { rotulo: 'Ver produtos', url: '/produtos' },
      ...(process.env.NEXT_PUBLIC_WHATSAPP_LINK
        ? [{ rotulo: 'Falar no WhatsApp', url: process.env.NEXT_PUBLIC_WHATSAPP_LINK }]
        : []),
      { rotulo: 'Acompanhar meu pedido', url: '/pedido' },
      ...(process.env.NEXT_PUBLIC_INSTAGRAM
        ? [{ rotulo: 'Instagram', url: process.env.NEXT_PUBLIC_INSTAGRAM }]
        : []),
    ],
  },
  pagamento: {
    pix_ativo: true,
    cartao_ativo: true,
    boleto_ativo: true,
    max_parcelas: 12,
    // Abaixo disto o parcelamento não é oferecido, para não gerar parcela de
    // R$ 4 que a operadora come inteira em taxa. 0 desliga a regra.
    parcela_minima: 0,
  },
  prazos: {
    // Dias de produção antes de despachar. Some do texto quando é 0.
    producao_dias: 0,
    texto_aguardando_pagamento: 'Aguardando pagamento',
    texto_pago: 'Pagamento confirmado',
    texto_em_processamento: 'Em produção',
    texto_enviado: 'Enviado',
    texto_entregue: 'Entregue',
    texto_cancelado: 'Cancelado',
  },
};

const CHAVES = Object.keys(PADRAO);

function texto(v, padrao = '') {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s || padrao;
}

function inteiro(v, padrao = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : padrao;
}

function dinheiro(v, padrao = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : padrao;
}

/**
 * Endereço de um botão da página de links: caminho do próprio site (/produtos)
 * ou endereço completo. Quem digita "wa.me/55..." sem protocolo ganha o https
 * na frente, em vez de um link quebrado na bio.
 */
function urlDeLink(v) {
  const s = texto(v);
  if (!s) return '';
  if (s.startsWith('/') || /^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/** Booleano que respeita `false` explícito, mas trata ausência como o padrão. */
function ligado(v, padrao) {
  if (v === true || v === false) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return padrao;
}

/**
 * Junta o que veio do banco com o padrão, bloco a bloco.
 *
 * Campo faltando, texto vazio ou número inválido caem no padrão: a vitrine nunca
 * fica com um título em branco porque alguém apagou o campo e salvou.
 */
function mesclarBloco(chave, bruto) {
  const p = PADRAO[chave];
  if (!p) return null;
  const c = bruto && typeof bruto === 'object' ? bruto : {};

  if (chave === 'campanha') return mesclarCampanha(bruto);

  if (chave === 'links') {
    const brutos = Array.isArray(c.itens) ? c.itens : p.itens;
    const itens = brutos
      .map(i => ({ rotulo: texto(i?.rotulo), url: urlDeLink(i?.url) }))
      .filter(i => i.rotulo && i.url)
      .slice(0, 12);
    return {
      titulo: texto(c.titulo, p.titulo),
      subtitulo: texto(c.subtitulo, p.subtitulo),
      // Apagar todos os botões não deixa a bio apontando para uma página vazia:
      // o conjunto padrão volta, como todo campo em branco desta tela.
      itens: itens.length ? itens : p.itens,
    };
  }

  if (chave === 'pagamento') {
    return {
      pix_ativo: ligado(c.pix_ativo, p.pix_ativo),
      cartao_ativo: ligado(c.cartao_ativo, p.cartao_ativo),
      boleto_ativo: ligado(c.boleto_ativo, p.boleto_ativo),
      // Entre 1 e 12: o Mercado Pago não parcela além disso, e zero parcelas não
      // existe. Valor fora da faixa vira o mais próximo, não um erro na tela.
      max_parcelas: Math.min(12, Math.max(1, inteiro(c.max_parcelas, p.max_parcelas))),
      parcela_minima: dinheiro(c.parcela_minima, p.parcela_minima),
    };
  }

  const saida = {};
  for (const [campo, valorPadrao] of Object.entries(p)) {
    saida[campo] =
      typeof valorPadrao === 'number'
        ? inteiro(c[campo], valorPadrao)
        : texto(c[campo], valorPadrao);
  }
  return saida;
}

/** Configuração inteira, com todos os blocos preenchidos. */
function mesclarTudo(bruto) {
  const b = bruto && typeof bruto === 'object' ? bruto : {};
  return Object.fromEntries(CHAVES.map(k => [k, mesclarBloco(k, b[k])]));
}

/**
 * Formas de pagamento a oferecer, na ordem em que aparecem no checkout.
 *
 * Desligar todas seria uma loja que não vende: se ninguém sobrou, o Pix volta,
 * porque é o meio sem custo de emissão e o que mais gente tem.
 */
function metodosAtivos(pagamento) {
  const p = mesclarBloco('pagamento', pagamento);
  const todos = [
    { id: 'pix', ativo: p.pix_ativo, label: 'Pix', desc: 'Pagamento instantâneo via QR Code.' },
    { id: 'card', ativo: p.cartao_ativo, label: 'Cartão de Crédito', desc: `Parcele em até ${p.max_parcelas}x.` },
    { id: 'boleto', ativo: p.boleto_ativo, label: 'Boleto Bancário', desc: 'Vence em 3 dias úteis.' },
  ];
  const ativos = todos.filter(m => m.ativo).map(({ ativo, ...m }) => m);
  return ativos.length ? ativos : [{ id: 'pix', label: 'Pix', desc: 'Pagamento instantâneo via QR Code.' }];
}

/**
 * Quantas parcelas cabem num valor, respeitando a parcela mínima.
 * Sempre pelo menos 1 — à vista é sempre possível.
 */
function parcelasPara(valor, pagamento) {
  const p = mesclarBloco('pagamento', pagamento);
  if (!(p.parcela_minima > 0)) return p.max_parcelas;
  const cabem = Math.floor(Number(valor || 0) / p.parcela_minima);
  return Math.min(p.max_parcelas, Math.max(1, cabem));
}

/** Rótulos de status do pedido, do jeito que o cliente lê. */
function rotulosDeStatus(prazos) {
  const p = mesclarBloco('prazos', prazos);
  return {
    aguardando_pagamento: p.texto_aguardando_pagamento,
    pago: p.texto_pago,
    em_processamento: p.texto_em_processamento,
    enviado: p.texto_enviado,
    entregue: p.texto_entregue,
    cancelado: p.texto_cancelado,
  };
}

async function lerConfigLoja(db) {
  try {
    const linhas = await db
      .prepare(`SELECT \`key\`, value FROM settings WHERE \`key\` IN (${CHAVES.map(() => '?').join(', ')})`)
      .all(...CHAVES);
    const bruto = {};
    for (const l of linhas || []) {
      try {
        bruto[l.key] = JSON.parse(l.value);
      } catch {
        // JSON corrompido em um bloco não pode derrubar os outros.
      }
    }
    return mesclarTudo(bruto);
  } catch {
    // Tabela ausente (banco antigo) não pode derrubar a loja: com o padrão, tudo
    // continua como estava escrito no código.
    return mesclarTudo(null);
  }
}

async function salvarBloco(db, chave, bruto) {
  if (!CHAVES.includes(chave)) throw new Error(`bloco de configuração desconhecido: ${chave}`);
  const valor = mesclarBloco(chave, bruto);
  await db
    .prepare('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)')
    .run(chave, JSON.stringify(valor));
  return valor;
}

module.exports = {
  PADRAO,
  CHAVES,
  mesclarBloco,
  mesclarTudo,
  metodosAtivos,
  parcelasPara,
  rotulosDeStatus,
  lerConfigLoja,
  salvarBloco,
};
