/**
 * Testes dos parâmetros da loja. Não toca no banco.
 * Rodar com: npm run teste-config
 */
const {
  PADRAO, mesclarBloco, mesclarTudo,
  metodosAtivos, parcelasPara, rotulosDeStatus,
} = require('../src/lib/config-loja');
const {
  mesclarCampanha, vigente, alcanca, precoDoProduto, textoDaFaixa,
} = require('../src/lib/campanha');
const { ehNovidade, seloDoProduto } = require('../src/lib/vitrine');
const { avisosDaLoja, urgencia, indiceDoDia } = require('../src/lib/avisos');

let passou = 0, falhou = 0;
const casos = [];

function teste(nome, fn) { casos.push([nome, fn]); }
function ok(cond, detalhe = '') {
  if (!cond) throw new Error('esperava verdadeiro' + (detalhe ? ` — ${detalhe}` : ''));
}
function igual(a, b, detalhe = '') {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`esperava ${y}, veio ${x}` + (detalhe ? ` — ${detalhe}` : ''));
}

// ---------- mescla ----------

teste('sem nada no banco, tudo vem do padrão', () => {
  const c = mesclarTudo(null);
  igual(c.loja.nome, PADRAO.loja.nome);
  igual(c.vitrine.titulo, PADRAO.vitrine.titulo);
  igual(c.pagamento.max_parcelas, 12);
});

teste('campo apagado volta ao padrão em vez de deixar buraco na página', () => {
  const c = mesclarBloco('vitrine', { titulo: '', subtitulo: '   ' });
  igual(c.titulo, PADRAO.vitrine.titulo);
  igual(c.subtitulo, PADRAO.vitrine.subtitulo);
});

teste('o que foi preenchido manda', () => {
  const c = mesclarBloco('loja', { nome: 'Outra Loja', email: 'a@b.com' });
  igual(c.nome, 'Outra Loja');
  igual(c.email, 'a@b.com');
  // o que não foi tocado continua no padrão
  igual(c.cidade_origem, '');
});

teste('bloco desconhecido não vira configuração', () => {
  igual(mesclarBloco('inventado', { x: 1 }), null);
});

teste('JSON corrompido em um bloco não derruba os outros', () => {
  const c = mesclarTudo({ loja: 'isto não é objeto', vitrine: { titulo: 'Vale' } });
  igual(c.loja.nome, PADRAO.loja.nome);
  igual(c.vitrine.titulo, 'Vale');
});

// ---------- pagamento ----------

teste('desligar uma forma de pagamento tira ela do checkout', () => {
  const m = metodosAtivos({ boleto_ativo: false });
  igual(m.map(x => x.id), ['pix', 'card']);
});

teste('false explícito é respeitado, ausência cai no padrão', () => {
  igual(mesclarBloco('pagamento', { pix_ativo: false }).pix_ativo, false);
  igual(mesclarBloco('pagamento', {}).pix_ativo, true);
  igual(mesclarBloco('pagamento', { pix_ativo: 'false' }).pix_ativo, false);
});

teste('desligar tudo não deixa a loja sem meio de pagamento', () => {
  const m = metodosAtivos({ pix_ativo: false, cartao_ativo: false, boleto_ativo: false });
  igual(m.map(x => x.id), ['pix'], 'o Pix volta como último recurso');
});

teste('parcelas ficam entre 1 e 12', () => {
  igual(mesclarBloco('pagamento', { max_parcelas: 99 }).max_parcelas, 12);
  igual(mesclarBloco('pagamento', { max_parcelas: 0 }).max_parcelas, 1);
  igual(mesclarBloco('pagamento', { max_parcelas: 'seis' }).max_parcelas, 12);
  igual(mesclarBloco('pagamento', { max_parcelas: 6 }).max_parcelas, 6);
});

teste('o texto do cartão acompanha o limite de parcelas', () => {
  const m = metodosAtivos({ max_parcelas: 6 });
  ok(m.find(x => x.id === 'card').desc.includes('6x'));
});

teste('parcela mínima limita o parcelamento pelo valor da compra', () => {
  const cfg = { max_parcelas: 12, parcela_minima: 50 };
  igual(parcelasPara(600, cfg), 12);
  igual(parcelasPara(200, cfg), 4);
  igual(parcelasPara(30, cfg), 1, 'compra menor que a parcela mínima ainda pode ser à vista');
});

teste('sem parcela mínima vale o máximo', () => {
  igual(parcelasPara(30, { max_parcelas: 10, parcela_minima: 0 }), 10);
});

// ---------- prazos ----------

teste('rótulos de status saem da configuração', () => {
  const r = rotulosDeStatus({ texto_enviado: 'Despachado' });
  igual(r.enviado, 'Despachado');
  igual(r.pago, PADRAO.prazos.texto_pago, 'o que não foi mudado continua igual');
});

teste('número inválido em prazo não vira NaN', () => {
  igual(mesclarBloco('prazos', { producao_dias: 'três' }).producao_dias, 0);
  igual(mesclarBloco('prazos', { producao_dias: -5 }).producao_dias, 0);
  igual(mesclarBloco('prazos', { producao_dias: '4' }).producao_dias, 4);
});


// ---------- liquidação ----------

const LIQUIDA = { ativa: true, nome: 'Liquidação de Primavera', percentual: 20, inicio: '2026-09-01', fim: '2026-09-30' };
const VASO = { price: 100, compare_price: null, category: 'decoração' };

teste('liquidação desligada não desconta nada', () => {
  igual(precoDoProduto(VASO, { ...LIQUIDA, ativa: false }, '2026-09-15').preco, 100);
  igual(precoDoProduto(VASO, null, '2026-09-15').preco, 100);
});

teste('percentual zero é o mesmo que desligada', () => {
  igual(vigente({ ...LIQUIDA, percentual: 0 }, '2026-09-15'), false);
});

teste('vale só dentro do período', () => {
  igual(vigente(LIQUIDA, '2026-08-31'), false, 'véspera');
  igual(vigente(LIQUIDA, '2026-09-01'), true, 'primeiro dia entra');
  igual(vigente(LIQUIDA, '2026-09-30'), true, 'último dia ainda vale');
  igual(vigente(LIQUIDA, '2026-10-01'), false, 'no dia seguinte acabou');
});

teste('sem data de início começa assim que liga; sem fim não termina', () => {
  igual(vigente({ ...LIQUIDA, inicio: '' }, '2020-01-01'), true);
  igual(vigente({ ...LIQUIDA, fim: '' }, '2099-01-01'), true);
});

teste('data escrita errado é ignorada em vez de virar filtro maluco', () => {
  igual(mesclarCampanha({ inicio: '30/09/2026' }).inicio, '');
  igual(mesclarCampanha({ fim: 'amanhã' }).fim, '');
});

teste('percentual fica entre 0 e 90', () => {
  igual(mesclarCampanha({ percentual: 200 }).percentual, 90, 'um zero a mais não zera a loja');
  igual(mesclarCampanha({ percentual: -5 }).percentual, 0);
  igual(mesclarCampanha({ percentual: 'vinte' }).percentual, 0);
  igual(mesclarCampanha({ percentual: '15' }).percentual, 15);
});

teste('o desconto sai em centavos redondos', () => {
  igual(precoDoProduto({ price: 100 }, LIQUIDA, '2026-09-15').preco, 80);
  igual(precoDoProduto({ price: 59.9 }, LIQUIDA, '2026-09-15').preco, 47.92);
  igual(precoDoProduto({ price: 34.9 }, { ...LIQUIDA, percentual: 15 }, '2026-09-15').preco, 29.67);
});

teste('o preço riscado é o maior que a peça já custou na tela', () => {
  const r = precoDoProduto({ price: 100 }, LIQUIDA, '2026-09-15');
  igual(r.preco_cheio, 100);
  // produto que ja estava em promocao mantem o comparativo como riscado
  const r2 = precoDoProduto({ price: 100, compare_price: 150 }, LIQUIDA, '2026-09-15');
  igual(r2.preco, 80);
  igual(r2.preco_cheio, 150);
});

teste('fora da liquidação, o desconto do cadastro continua valendo', () => {
  const r = precoDoProduto({ price: 100, compare_price: 150 }, LIQUIDA, '2026-10-15');
  igual(r.preco, 100);
  igual(r.preco_cheio, 150);
  igual(r.em_liquidacao, false);
});

teste('liquidação por categoria não alcança o resto do catálogo', () => {
  const so = { ...LIQUIDA, categoria: 'decoração' };
  igual(alcanca(VASO, so, '2026-09-15'), true);
  igual(alcanca({ price: 10, category: 'escritório' }, so, '2026-09-15'), false);
  igual(precoDoProduto({ price: 10, category: 'escritório' }, so, '2026-09-15').preco, 10);
});

teste('categoria compara sem se importar com maiúscula', () => {
  igual(alcanca({ category: 'Decoração' }, { ...LIQUIDA, categoria: 'decoração' }, '2026-09-15'), true);
});

teste('a faixa monta o texto sozinha, e o texto próprio manda', () => {
  igual(textoDaFaixa(LIQUIDA), 'Liquidação de Primavera: 20% de desconto');
  igual(textoDaFaixa({ ...LIQUIDA, categoria: 'vasos' }), 'Liquidação de Primavera: 20% de desconto em vasos');
  igual(textoDaFaixa({ ...LIQUIDA, texto: 'Tudo pela metade!' }), 'Tudo pela metade!');
});


// ---------- tarja de avisos ----------

const LOJA = mesclarTudo({
  campanha: { ativa: false },
  prazos: { producao_dias: 3 },
  pagamento: { max_parcelas: 10 },
  vitrine: { dias_novidade: 30 },
});
const NOVA = { nome: 'Vaso Espiral', slug: 'vaso-espiral', created_at: '2026-09-10T10:00:00Z' };
const ids = (...args) => avisosDaLoja(...args).map(a => a.id);

teste('cada aviso nasce de um parâmetro; o que não está configurado não vira frase', () => {
  igual(ids(LOJA, { hoje: '2026-09-15' }), ['producao', 'parcelamento']);
  igual(ids(LOJA, { gratisAcima: 199.9, hoje: '2026-09-15' }),
    ['frete', 'producao', 'parcelamento']);
  igual(ids(mesclarTudo(null), { hoje: '2026-09-15' }), ['parcelamento'],
    'a loja recém-instalada anuncia o parcelamento e mais nada');
});

teste('loja sem nada a dizer devolve lista vazia, e a tarja some', () => {
  const muda = mesclarTudo({ pagamento: { cartao_ativo: false }, prazos: { producao_dias: 0 } });
  igual(ids(muda, { hoje: '2026-09-15' }), []);
});

teste('a liquidação abre a tarja, e na última semana conta os dias', () => {
  const com = mesclarTudo({ ...LOJA, campanha: LIQUIDA });
  igual(ids(com, { hoje: '2026-09-15' })[0], 'liquidacao', 'vem antes de todo o resto');
  igual(avisosDaLoja(com, { hoje: '2026-09-15' })[0].texto,
    'Liquidação de Primavera: 20% de desconto', 'longe do fim, sem contagem');
  igual(avisosDaLoja(com, { hoje: '2026-09-30' })[0].texto,
    'Liquidação de Primavera: 20% de desconto — termina hoje');
  igual(avisosDaLoja(com, { hoje: '2026-10-01' }).length, 2, 'no dia seguinte sai da tarja');
});

teste('a contagem só aparece na última semana — "faltam 25 dias" é o contrário de pressa', () => {
  igual(urgencia('2026-09-30', '2026-09-30'), 'termina hoje');
  igual(urgencia('2026-09-29', '2026-09-30'), 'termina amanhã');
  igual(urgencia('2026-09-24', '2026-09-30'), 'faltam 6 dias');
  igual(urgencia('2026-09-23', '2026-09-30'), '', '7 dias ainda não é urgência');
  igual(urgencia('2026-09-15', ''), '', 'liquidação sem fim não conta nada');
  igual(urgencia('2026-10-01', '2026-09-30'), '', 'data já passada não vira contagem');
});

teste('a novidade da tarja obedece a mesma janela do selo do card', () => {
  igual(ids(LOJA, { novidade: NOVA, hoje: '2026-09-15' }),
    ['novidade', 'producao', 'parcelamento']);
  igual(ids(LOJA, { novidade: NOVA, hoje: '2026-11-15' }),
    ['producao', 'parcelamento'], 'passados 30 dias deixa de ser novidade');
  igual(ids(LOJA, { novidade: { nome: 'Sem slug' }, hoje: '2026-09-15' }),
    ['producao', 'parcelamento'], 'produto sem link não vira aviso');
});

teste('o aviso da novidade leva para a própria peça', () => {
  const a = avisosDaLoja(LOJA, { novidade: NOVA, hoje: '2026-09-15' })[0];
  igual(a.texto, 'Novidade na loja: Vaso Espiral');
  igual(a.href, '/produtos/vaso-espiral');
});

teste('frete grátis sai em reais, e zero não vira "acima de R$ 0"', () => {
  igual(avisosDaLoja(LOJA, { gratisAcima: 199.9, hoje: '2026-09-15' })[0].texto,
    'Frete grátis nas compras acima de R$ 199,90');
  igual(ids(LOJA, { gratisAcima: 0, hoje: '2026-09-15' }), ['producao', 'parcelamento']);
});

teste('um dia útil não vira "até 1 dias úteis"', () => {
  const um = mesclarTudo({ prazos: { producao_dias: 1 } });
  igual(avisosDaLoja(um, { hoje: '2026-09-15' })[0].texto, 'Sua peça fica pronta em 1 dia útil');
  igual(avisosDaLoja(LOJA, { hoje: '2026-09-15' })[0].texto,
    'Sua peça fica pronta em até 3 dias úteis');
});

teste('sem giro, o aviso do dia muda de um dia para o outro e nunca sai da lista', () => {
  igual(indiceDoDia('2026-09-15', 3), indiceDoDia('2026-09-18', 3), 'volta ao mesmo a cada 3 dias');
  ok(indiceDoDia('2026-09-15', 3) !== indiceDoDia('2026-09-16', 3), 'dias seguidos, avisos diferentes');
  for (const dia of ['2026-09-15', '2026-09-16', '2026-09-17', '1999-01-01']) {
    const i = indiceDoDia(dia, 3);
    ok(i >= 0 && i < 3, `índice fora da lista em ${dia}`);
  }
  igual(indiceDoDia('2026-09-15', 0), 0, 'lista vazia não estoura');
});


// ---------- selos da vitrine ----------

teste('produto recem-cadastrado e novidade; produto antigo nao', () => {
  igual(ehNovidade({ created_at: '2026-09-01T10:00:00Z' }, 30, '2026-09-15'), true);
  igual(ehNovidade({ created_at: '2026-07-01T10:00:00Z' }, 30, '2026-09-15'), false);
  // "dura 30 dias" conta o dia do cadastro: vale do dia 0 ao 29, e sai no 30o
  igual(ehNovidade({ created_at: '2026-08-17T10:00:00Z' }, 30, '2026-09-15'), true, '29o dia ainda conta');
  igual(ehNovidade({ created_at: '2026-08-16T10:00:00Z' }, 30, '2026-09-15'), false, 'no 30o dia sai');
});

teste('zero dias desliga o selo de novidade', () => {
  igual(ehNovidade({ created_at: '2026-09-15T10:00:00Z' }, 0, '2026-09-15'), false);
});

teste('cadastro sem data ou com data invalida nao vira novidade', () => {
  igual(ehNovidade({}, 30, '2026-09-15'), false);
  igual(ehNovidade({ created_at: 'ontem' }, 30, '2026-09-15'), false);
});

teste('so um selo por card, na ordem de prioridade', () => {
  const novo = { created_at: '2026-09-10T10:00:00Z', featured: 1, category: 'decoração' };
  const opts = { campanha: LIQUIDA, diasNovidade: 30, hoje: '2026-09-15' };
  igual(seloDoProduto(novo, opts).id, 'liquidacao', 'liquidacao passa na frente');
  igual(seloDoProduto(novo, { ...opts, campanha: null }).id, 'novidade', 'sem liquidacao, novidade');
  igual(seloDoProduto({ ...novo, created_at: '2026-01-01T10:00:00Z' }, { ...opts, campanha: null }).id, 'destaque');
});

teste('produto comum nao anuncia nada', () => {
  igual(seloDoProduto({ created_at: '2026-01-01T10:00:00Z', featured: 0 }, { campanha: null, diasNovidade: 30, hoje: '2026-09-15' }), null);
});

(async () => {
  for (const [nome, fn] of casos) {
    try {
      await fn();
      passou++;
      console.log(`  ok   ${nome}`);
    } catch (e) {
      falhou++;
      console.log(`  FALHOU  ${nome}\n         ${e.message}`);
    }
  }
  console.log(`\n${passou} passaram, ${falhou} falharam`);
  process.exit(falhou ? 1 : 0);
})();
