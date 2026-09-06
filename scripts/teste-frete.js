/**
 * Testes do cálculo de frete e da conferência do carrinho.
 * Não toca no banco real. Rodar com: npm run teste-frete
 */
const {
  mesclarConfig, regiaoDaUf, pesoDoPedido, precoDaEntrega,
  calcularOpcoes, precoDaOpcao, CONFIG_PADRAO,
  volumeDoPedido, pesoCubado, pesoParaFrete,
} = require('../src/lib/frete');
const { lerTexto, medidas, volumeCm3, textoParaGravar } = require('../src/lib/dimensoes');
const { conferirCarrinho } = require('../src/lib/carrinho-servidor');

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

// Tabela de exemplo usada pelos testes — nada aqui vira preço da loja.
const TABELA = {
  peso_base_g: 500,
  peso_padrao_g: 300,
  gratis_acima: 200,
  retirada: { ativa: true, titulo: 'Retirar', endereco: 'Loja', prazo_dias: 2 },
  regioes: {
    norte: { base: 20, kg_extra: 5, prazo_dias: 4 },
    nordeste: { base: 30, kg_extra: 8, prazo_dias: 7 },
    centro_oeste: { base: 30, kg_extra: 8, prazo_dias: 7 },
    sudeste: { base: 40, kg_extra: 10, prazo_dias: 9 },
    sul: { base: 45, kg_extra: 12, prazo_dias: 10 },
  },
};

// ---------- configuração ----------

teste('config ausente vira o padrão zerado', () => {
  const c = mesclarConfig(null);
  igual(c.regioes.norte, { base: 0, kg_extra: 0, prazo_dias: 0 });
  igual(c.gratis_acima, 0);
  ok(c.retirada.ativa, 'retirada nasce ligada');
});

teste('config pela metade completa o que falta', () => {
  const c = mesclarConfig({ regioes: { norte: { base: 15 } } });
  igual(c.regioes.norte, { base: 15, kg_extra: 0, prazo_dias: 0 });
  igual(c.regioes.sul, { base: 0, kg_extra: 0, prazo_dias: 0 });
  igual(c.peso_base_g, CONFIG_PADRAO.peso_base_g);
});

teste('texto e valor negativo no preço não viram NaN', () => {
  const c = mesclarConfig({ gratis_acima: 'oitenta', regioes: { sul: { base: -10, kg_extra: 'x' } } });
  igual(c.gratis_acima, 0);
  igual(c.regioes.sul.base, 0);
  igual(c.regioes.sul.kg_extra, 0);
});

// ---------- regiões ----------

teste('UF cai na região certa', () => {
  igual(regiaoDaUf('PA'), 'norte');
  igual(regiaoDaUf('ba'), 'nordeste');
  igual(regiaoDaUf(' sp '), 'sudeste');
  igual(regiaoDaUf('MS'), 'centro_oeste');
  igual(regiaoDaUf('RS'), 'sul');
});

teste('UF inexistente não tem região', () => {
  igual(regiaoDaUf('XX'), null);
  igual(regiaoDaUf(''), null);
  igual(regiaoDaUf(undefined), null);
});

// ---------- peso ----------

teste('produto sem peso cadastrado usa o peso padrão', () => {
  igual(pesoDoPedido([{ peso_g: 0, quantity: 2 }], TABELA), 600);
});

teste('peso soma por quantidade', () => {
  igual(pesoDoPedido([{ peso_g: 250, quantity: 3 }, { peso_g: 100, quantity: 1 }], TABELA), 850);
});

// ---------- preço da entrega ----------

teste('pedido leve paga só a base', () => {
  igual(precoDaEntrega(TABELA, 'norte', 400), 20);
  igual(precoDaEntrega(TABELA, 'norte', 500), 20);
});

teste('cada quilo (ou fração) acima do peso base soma o adicional', () => {
  igual(precoDaEntrega(TABELA, 'norte', 501), 25);   // 1 kg extra
  igual(precoDaEntrega(TABELA, 'norte', 1500), 25);  // ainda 1 kg
  igual(precoDaEntrega(TABELA, 'norte', 1501), 30);  // 2 kg
  igual(precoDaEntrega(TABELA, 'sul', 2500), 45 + 24);
});

teste('região desconhecida não tem preço', () => {
  igual(precoDaEntrega(TABELA, 'antartida', 100), null);
});

// ---------- opções no checkout ----------

teste('sem UF só há retirada, e a tela sabe que falta o CEP', () => {
  const r = calcularOpcoes({ config: TABELA, uf: '', subtotal: 50, peso_g: 300 });
  igual(r.opcoes.map(o => o.id), ['retirada']);
  ok(r.precisa_uf);
});

teste('com UF aparecem retirada e entrega', () => {
  const r = calcularOpcoes({ config: TABELA, uf: 'PA', subtotal: 50, peso_g: 300 });
  igual(r.opcoes.map(o => o.id), ['retirada', 'entrega']);
  igual(r.opcoes[1].preco, 20);
  igual(r.opcoes[1].prazo_dias, 4);
  ok(!r.precisa_uf);
});

teste('retirada desligada some do checkout', () => {
  const cfg = { ...TABELA, retirada: { ...TABELA.retirada, ativa: false } };
  const r = calcularOpcoes({ config: cfg, uf: 'PA', subtotal: 50, peso_g: 300 });
  igual(r.opcoes.map(o => o.id), ['entrega']);
});

teste('retirada é sempre grátis', () => {
  const r = calcularOpcoes({ config: TABELA, uf: 'SP', subtotal: 10, peso_g: 9000 });
  igual(r.opcoes.find(o => o.id === 'retirada').preco, 0);
});

teste('subtotal acima do mínimo zera a entrega e guarda o preço cheio', () => {
  const r = calcularOpcoes({ config: TABELA, uf: 'PA', subtotal: 200, peso_g: 300 });
  const entrega = r.opcoes.find(o => o.id === 'entrega');
  igual(entrega.preco, 0);
  igual(entrega.preco_cheio, 20);
  ok(entrega.gratis);
  igual(r.falta_para_gratis, 0);
});

teste('abaixo do mínimo diz quanto falta', () => {
  const r = calcularOpcoes({ config: TABELA, uf: 'PA', subtotal: 180.5, peso_g: 300 });
  igual(r.falta_para_gratis, 19.5);
  igual(r.opcoes.find(o => o.id === 'entrega').preco, 20);
});

teste('frete grátis desligado nunca zera a entrega', () => {
  const cfg = { ...TABELA, gratis_acima: 0 };
  const r = calcularOpcoes({ config: cfg, uf: 'PA', subtotal: 99999, peso_g: 300 });
  igual(r.opcoes.find(o => o.id === 'entrega').preco, 20);
  igual(r.falta_para_gratis, 0);
});

teste('tabela zerada mantém a loja como era: entrega sem cobrança', () => {
  const r = calcularOpcoes({ config: null, uf: 'PA', subtotal: 50, peso_g: 5000 });
  igual(r.opcoes.find(o => o.id === 'entrega').preco, 0);
});

// ---------- preço cobrado ----------

teste('o preço cobrado é recalculado pelo id, não pelo que o navegador manda', () => {
  igual(precoDaOpcao({ config: TABELA, id: 'entrega', uf: 'RS', subtotal: 10, peso_g: 300 }), 45);
  igual(precoDaOpcao({ config: TABELA, id: 'retirada', uf: 'RS', subtotal: 10, peso_g: 300 }), 0);
});

teste('opção inventada não tem preço — o checkout recusa', () => {
  igual(precoDaOpcao({ config: TABELA, id: 'gratis_pra_mim', uf: 'RS', subtotal: 10, peso_g: 300 }), null);
  igual(precoDaOpcao({ config: TABELA, id: '', uf: 'RS', subtotal: 10, peso_g: 300 }), null);
});

teste('entrega sem UF não tem preço — o checkout recusa', () => {
  igual(precoDaOpcao({ config: TABELA, id: 'entrega', uf: '', subtotal: 10, peso_g: 300 }), null);
});

teste('retirada com a retirada desligada não tem preço', () => {
  const cfg = { ...TABELA, retirada: { ...TABELA.retirada, ativa: false } };
  igual(precoDaOpcao({ config: cfg, id: 'retirada', uf: 'RS', subtotal: 10, peso_g: 300 }), null);
});

// ---------- conferência do carrinho ----------

function dbFalso(produtos) {
  return {
    prepare() {
      return {
        async all(...ids) { return produtos.filter(p => ids.includes(p.id)); },
        async get() { return null; },
        async run() { return { changes: 0 }; },
      };
    },
  };
}

const CATALOGO = [
  { id: 1, name: 'Vaso', price: 50, weight: 400, active: 1 },
  { id: 2, name: 'Chaveiro', price: 10, weight: null, active: 1 },
  { id: 3, name: 'Fora de linha', price: 99, weight: 100, active: 0 },
  // Leve e volumoso: o caso que a tabela só por peso cobra barato demais.
  { id: 4, name: 'Vaso grande', price: 120, weight: 400, length_cm: 30, width_cm: 25, height_cm: 20, active: 1 },
];

teste('preço vem do banco, não do que o navegador mandou', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 1, quantity: 2, price: 0.01 }]);
  ok(r.ok, r.erro);
  igual(r.subtotal, 100);
  igual(r.itens[0].price, 50);
  igual(r.itens[0].name, 'Vaso');
});

teste('nome do produto também vem do banco', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 2, quantity: 1, name: 'Outra coisa' }]);
  ok(r.ok, r.erro);
  igual(r.itens[0].name, 'Chaveiro');
});

teste('o mesmo produto repetido soma quantidade', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [
    { product_id: 1, quantity: 1 }, { product_id: 1, quantity: 2 },
  ]);
  ok(r.ok, r.erro);
  igual(r.itens.length, 1);
  igual(r.itens[0].quantity, 3);
  igual(r.subtotal, 150);
});

teste('produto inexistente derruba o pedido', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 999, quantity: 1 }]);
  ok(!r.ok);
  ok(/não existe mais/.test(r.erro), r.erro);
});

teste('produto desativado derruba o pedido', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 3, quantity: 1 }]);
  ok(!r.ok);
  ok(/saiu do catálogo/.test(r.erro), r.erro);
});

teste('quantidade zero, negativa ou quebrada é recusada', async () => {
  for (const q of [0, -1, 1.5, '1.5', 'dois', null, undefined, {}]) {
    const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 1, quantity: q }]);
    ok(!r.ok, `quantidade ${q} passou`);
  }
});

teste('carrinho vazio é recusado', async () => {
  igual((await conferirCarrinho(dbFalso(CATALOGO), [])).ok, false);
  igual((await conferirCarrinho(dbFalso(CATALOGO), null)).ok, false);
});

teste('produto sem peso cadastrado entra com peso zero e o frete resolve', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 2, quantity: 4 }]);
  ok(r.ok, r.erro);
  igual(r.itens[0].peso_g, 0);
  igual(pesoDoPedido(r.itens, TABELA), 1200); // 4 × peso padrão (300 g)
});

// ---------- carrinho + frete de ponta a ponta ----------

teste('carrinho pesado do banco resulta no frete da faixa certa', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 1, quantity: 5 }]); // 5 × 400 g = 2000 g
  ok(r.ok, r.erro);
  const peso = pesoDoPedido(r.itens, TABELA);
  igual(peso, 2000);
  // 250 de subtotal passa do mínimo de frete grátis (200)
  igual(precoDaOpcao({ config: TABELA, id: 'entrega', uf: 'PA', subtotal: r.subtotal, peso_g: peso }), 0);
  // com o frete grátis desligado, paga base + 2 kg extras
  const semGratis = { ...TABELA, gratis_acima: 0 };
  igual(precoDaOpcao({ config: semGratis, id: 'entrega', uf: 'PA', subtotal: r.subtotal, peso_g: peso }), 20 + 10);
});


// ---------- dimensões e cubagem ----------

teste('texto de dimensão vira números quando dá para ler', () => {
  igual(lerTexto('15x15x20 cm'), { length_cm: 15, width_cm: 15, height_cm: 20 });
  igual(lerTexto('10,5 x 8 x 3'), { length_cm: 10.5, width_cm: 8, height_cm: 3 });
  igual(lerTexto('15X15X20cm'), { length_cm: 15, width_cm: 15, height_cm: 20 });
});

teste('texto que não dá para ler não vira medida inventada', () => {
  igual(lerTexto('aprox. 10 cm'), null);
  igual(lerTexto('15x15'), null);
  igual(lerTexto(''), null);
  igual(lerTexto(null), null);
});

teste('meia medida não serve para cotar', () => {
  igual(medidas({ length_cm: 10, width_cm: 5 }), null);
  igual(volumeCm3({ length_cm: 10, width_cm: 5 }), 0);
  igual(volumeCm3({ length_cm: 10, width_cm: 5, height_cm: 0 }), 0);
});

teste('volume é o produto das três medidas', () => {
  igual(volumeCm3({ length_cm: 30, width_cm: 25, height_cm: 20 }), 15000);
});

teste('o texto da ficha sai dos números', () => {
  igual(textoParaGravar({ length_cm: 15, width_cm: 15, height_cm: 20 }, 'qualquer coisa'), '15 x 15 x 20 cm');
});

teste('sem os três números o texto antigo é preservado', () => {
  igual(textoParaGravar({ length_cm: 15 }, 'tamanho de um A5'), 'tamanho de um A5');
  igual(textoParaGravar({}, ''), '');
});

teste('cubagem nasce desligada e não mexe no peso', () => {
  igual(mesclarConfig(null).divisor_cubagem, 0);
  igual(pesoCubado(15000, TABELA), 0);
  igual(pesoParaFrete([{ peso_g: 400, volume_cm3: 15000, quantity: 1 }], TABELA), 400);
});

teste('cubagem ligada cobra pelo espaço quando o espaço pesa mais', () => {
  const cfg = { ...TABELA, divisor_cubagem: 6000 };
  igual(pesoCubado(15000, cfg), 2500);
  igual(pesoParaFrete([{ peso_g: 400, volume_cm3: 15000, quantity: 1 }], cfg), 2500);
});

teste('peça pesada e pequena continua pagando pela balança', () => {
  const cfg = { ...TABELA, divisor_cubagem: 6000 };
  igual(pesoParaFrete([{ peso_g: 3000, volume_cm3: 6000, quantity: 1 }], cfg), 3000);
});

teste('volume soma por quantidade', () => {
  igual(volumeDoPedido([{ volume_cm3: 1000, quantity: 3 }]), 3000);
  igual(volumeDoPedido([{ volume_cm3: 0, quantity: 3 }]), 0);
});

teste('caixa menor que o mínimo não cuba', () => {
  const cfg = { ...TABELA, divisor_cubagem: 6000, cubagem_minima_cm3: 10000 };
  igual(pesoCubado(9000, cfg), 0);
  igual(pesoCubado(15000, cfg), 2500);
});

teste('produto sem medida cadastrada não inventa volume', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 2, quantity: 1 }]);
  igual(r.itens[0].volume_cm3, 0);
});

teste('o volume vem do banco e muda a faixa cobrada', async () => {
  const r = await conferirCarrinho(dbFalso(CATALOGO), [{ product_id: 4, quantity: 1 }]);
  igual(r.itens[0].volume_cm3, 15000);
  const cfg = { ...TABELA, divisor_cubagem: 6000, gratis_acima: 0 };
  // 400 g na balança, 2500 g de espaço: 2 kg acima do peso base
  igual(pesoParaFrete(r.itens, cfg), 2500);
  igual(precoDaOpcao({ config: cfg, id: 'entrega', uf: 'PA', subtotal: r.subtotal, peso_g: pesoParaFrete(r.itens, cfg) }), 20 + 10);
  // sem cubagem o mesmo pedido nao passa do peso base e paga so a base
  const semCubagem = { ...cfg, divisor_cubagem: 0 };
  igual(precoDaOpcao({ config: semCubagem, id: 'entrega', uf: 'PA', subtotal: r.subtotal, peso_g: pesoParaFrete(r.itens, semCubagem) }), 20);
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
