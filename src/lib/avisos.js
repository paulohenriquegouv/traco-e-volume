/**
 * O que a tarja do topo anuncia.
 *
 * A primeira linha da página é o espaço mais caro do site, e ela não se paga
 * repetindo o menu: "ver produtos" já está no cabeçalho e num botão logo abaixo.
 * O que se paga ali é a informação que derruba a objeção de comprar — quanto
 * custa a entrega, quando a peça fica pronta, em quantas vezes dá para pagar —
 * e o motivo para olhar hoje: uma liquidação com prazo, uma peça recém-chegada.
 *
 * Cada aviso nasce de um dado que a loja já tem. Nada aqui é escrito à mão duas
 * vezes: mexer no frete grátis ou cadastrar um produto muda a tarja sozinho, e o
 * que não está configurado simplesmente não vira aviso, em vez de virar uma
 * frase vazia ("frete grátis acima de R$ 0"). Sem nada configurado, a lista sai
 * vazia e a tarja não aparece.
 *
 * A ordem é de prioridade, e a primeira é a que aparece quando a página abre:
 *
 *   1. Liquidação — tem prazo, e prazo é o que faz clicar hoje.
 *   2. Frete grátis — a objeção mais comum de todas.
 *   3. Novidade — quem já conhece a loja quer ver o que entrou.
 *   4. Prazo de produção — responde "quando chega?" antes da pergunta.
 *   5. Parcelamento — o que torna a peça cara possível.
 *   6. Formas de pagamento — sempre há uma ativa, então este aviso sempre existe.
 *   7. O selo da vitrine — a frase que a loja já escolheu para se apresentar.
 *
 * Os dois últimos são o PISO da lista, e existem por um motivo prático: os cinco
 * primeiros dependem de alguém ter preenchido frete grátis, prazo ou liquidação.
 * Loja recém-instalada tinha só o parcelamento, e uma frase sozinha não gira —
 * a tarja parecia quebrada quando estava apenas vazia de informação. Com o piso,
 * qualquer loja tem pelo menos três frases desde o primeiro minuto, e cada campo
 * preenchido acrescenta uma melhor na frente delas.
 *
 * Todo aviso leva para dentro da loja. Nenhum tira o visitante do site.
 *
 * Funções puras, testáveis sem banco: `npm run teste-config`.
 */

const { vigente, mesclarCampanha, textoDaFaixa, hojeEmBelem } = require('./campanha');
const { ehNovidade } = require('./vitrine');
const { metodosAtivos } = require('./config-loja');

// Como cada meio de pagamento entra no meio da frase "Pague ...".
const COMO_PAGAR = { pix: 'no Pix', card: 'no cartão', boleto: 'no boleto' };

function inteiro(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function reais(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

/** "no Pix", "no Pix ou no boleto", "no Pix, no cartão ou no boleto". */
function lista(itens) {
  if (itens.length <= 1) return itens[0] || '';
  return `${itens.slice(0, -1).join(', ')} ou ${itens[itens.length - 1]}`;
}

/** Dias inteiros de `hoje` até `fim`. Null quando alguma das datas não presta. */
function diasAte(hoje, fim) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fim || ''))) return null;
  const a = new Date(`${hoje}T00:00:00Z`).getTime();
  const b = new Date(`${fim}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * A pressa que a liquidação carrega hoje, ou '' quando ainda falta muito.
 *
 * Só entra na última semana: "faltam 25 dias" é o contrário de urgência — avisa
 * que dá para deixar para depois.
 */
function urgencia(hoje, fim) {
  const dias = diasAte(hoje, fim);
  if (dias === null || dias < 0) return '';
  if (dias === 0) return 'termina hoje';
  if (dias === 1) return 'termina amanhã';
  if (dias <= 6) return `faltam ${dias} dias`;
  return '';
}

/**
 * Os avisos da tarja, em ordem de prioridade.
 *
 * @param config    o que veio de mesclarTudo (campanha, vitrine, prazos, pagamento)
 * @param extras    `gratisAcima` da tabela de frete e `novidade`, o produto mais
 *                  recente do catálogo ({ nome, slug, created_at })
 * @returns [{ id, texto, href }]
 */
function avisosDaLoja(config, { gratisAcima = 0, novidade = null, hoje = hojeEmBelem() } = {}) {
  const c = config && typeof config === 'object' ? config : {};
  const vitrine = c.vitrine || {};
  const prazos = c.prazos || {};
  const pagamento = c.pagamento || {};
  const avisos = [];

  if (vigente(c.campanha, hoje)) {
    const pressa = urgencia(hoje, mesclarCampanha(c.campanha).fim);
    const texto = textoDaFaixa(c.campanha);
    avisos.push({
      id: 'liquidacao',
      texto: pressa ? `${texto} — ${pressa}` : texto,
      href: '/produtos',
    });
  }

  const gratis = Number(gratisAcima);
  if (Number.isFinite(gratis) && gratis > 0) {
    avisos.push({
      id: 'frete',
      texto: `Frete grátis nas compras acima de ${reais(gratis)}`,
      href: '/produtos',
    });
  }

  // A janela de novidade é a mesma do selo na vitrine: o que deixou de ser
  // novidade no card não pode continuar sendo novidade no topo.
  if (novidade && novidade.slug && novidade.nome
      && ehNovidade(novidade, vitrine.dias_novidade, hoje)) {
    avisos.push({
      id: 'novidade',
      texto: `Novidade na loja: ${novidade.nome}`,
      href: `/produtos/${novidade.slug}`,
    });
  }

  const producao = inteiro(prazos.producao_dias);
  if (producao > 0) {
    avisos.push({
      id: 'producao',
      texto: producao === 1
        ? 'Sua peça fica pronta em 1 dia útil'
        : `Sua peça fica pronta em até ${producao} dias úteis`,
      href: '/produtos',
    });
  }

  const parcelas = inteiro(pagamento.max_parcelas);
  if (pagamento.cartao_ativo !== false && parcelas > 1) {
    avisos.push({
      id: 'parcelamento',
      texto: `Parcele em até ${parcelas}× no cartão`,
      href: '/produtos',
    });
  }

  const formas = metodosAtivos(pagamento).map(m => COMO_PAGAR[m.id]).filter(Boolean);
  if (formas.length) {
    avisos.push({ id: 'pagamento', texto: `Pague ${lista(formas)}`, href: '/produtos' });
  }

  const selo = String(vitrine.selo || '').trim();
  if (selo) {
    avisos.push({ id: 'selo', texto: selo, href: '/produtos' });
  }

  return avisos;
}

module.exports = { avisosDaLoja, urgencia };
