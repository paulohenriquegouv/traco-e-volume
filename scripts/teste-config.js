/**
 * Testes dos parâmetros da loja. Não toca no banco.
 * Rodar com: npm run teste-config
 */
const {
  PADRAO, mesclarBloco, mesclarTudo,
  metodosAtivos, parcelasPara, rotulosDeStatus,
} = require('../src/lib/config-loja');

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
  igual(c.endereco_retirada, '');
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
