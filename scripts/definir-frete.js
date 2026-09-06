/**
 * Grava a tabela de frete e as embalagens direto no banco.
 *
 *   npm run definir-frete
 *
 * Serve para preencher de uma vez o que a tela /admin/configuracoes → Entrega
 * pede campo a campo — útil quando os valores vêm de uma cotação feita fora, ou
 * para repor tudo depois de um teste. Editar os valores AQUI e rodar de novo.
 *
 * A tela continua sendo a dona: qualquer coisa alterada por ela depois vale mais
 * que este arquivo, que não roda sozinho nunca.
 *
 * Os preços que estão aqui são ESTIMATIVA, não cotação — a decisão foi essa em
 * 06/09/2026, com a loja ainda sem divulgação e sem venda real: melhor começar
 * perto do certo e corrigir na primeira postagem do que seguir com frete zero.
 * O roteiro para trocá-los pelos valores reais está junto da tabela, abaixo.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { mesclarConfig, CHAVE_SETTING } = require('../src/lib/frete');

// ---------------------------------------------------------------------------
// Caixas de papelão em tamanhos correntes de mercado. O peso é o da caixa VAZIA,
// já contando fita e plástico-bolha. Trocar pelas suas medidas reais assim que
// souber quais caixa você usa.
// ---------------------------------------------------------------------------
const EMBALAGENS = [
  { id: 'pequena', nome: 'Caixa pequena', length_cm: 16, width_cm: 11, height_cm: 6, peso_g: 50 },
  { id: 'media', nome: 'Caixa média', length_cm: 27, width_cm: 18, height_cm: 9, peso_g: 120 },
  { id: 'grande', nome: 'Caixa grande', length_cm: 35, width_cm: 25, height_cm: 20, peso_g: 300 },
];

// ---------------------------------------------------------------------------
// Preço por região, saindo de Belém (PA) — CEP 66050-585.
//
// ESTIMATIVA DE PARTIDA, decidida assim em 06/09/2026: a loja ainda não foi
// divulgada e não tem venda real, então vale mais começar cobrando algo perto do
// certo e corrigir com a primeira postagem do que seguir com frete zero.
//
// De onde vêm os números: Belém é a origem mais cara do país para encomenda, e
// do Pará todo destino é longo — por isso a diferença entre a região mais barata
// e a mais cara é menor do que seria numa loja do Sudeste. As referências
// públicas (R$ 10 a R$ 12 por quilo) são de rota do Sudeste e serviram só para
// ancorar a ordem de grandeza, não para copiar.
//
// NÃO É COTAÇÃO. Para trocar pelos valores reais, cotar o PAC de 66050-585 com a
// caixa média (27x18x9) para 66815-000 (Belém) e 01310-100 (São Paulo), em
// 0,5 kg e 2 kg:
//
//   base     = preço de 0,5 kg (pedido até o peso base)
//   kg_extra = (preço de 2 kg menos o preço de 0,5 kg) dividido por 2
// ---------------------------------------------------------------------------
const REGIOES = {
  norte:        { base: 25, kg_extra: 6,  prazo_dias: 6 },
  nordeste:     { base: 32, kg_extra: 8,  prazo_dias: 9 },
  centro_oeste: { base: 36, kg_extra: 9,  prazo_dias: 10 },
  sudeste:      { base: 38, kg_extra: 10, prazo_dias: 10 },
  sul:          { base: 42, kg_extra: 11, prazo_dias: 12 },
};

const OUTROS = {
  peso_base_g: 500,
  peso_padrao_g: 300,
  // Fator dos Correios: cada 6.000 cm³ contam como 1 kg, e vale o maior entre
  // peso real e cubado. Sem isto, peça grande e leve — o normal em impressão 3D —
  // sai por um preço que a transportadora não pratica.
  divisor_cubagem: 6000,
  cubagem_minima_cm3: 0,
  gratis_acima: 0,
};

function lerEnv() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  for (const linha of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const chave = t.slice(0, i).trim();
    if (!process.env[chave]) process.env[chave] = t.slice(i + 1).trim();
  }
}

const real = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function main() {
  lerEnv();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada (.env.local).');
    process.exit(1);
  }
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
  });
  console.log(`Banco: ${u.hostname}/${u.pathname.replace(/^\//, '')}\n`);

  // Parte do que já está salvo: retirada e qualquer ajuste feito na tela
  // sobrevivem, em vez de serem apagados por um script de linha de comando.
  const [linhas] = await conn.query('SELECT value FROM settings WHERE `key` = ?', [CHAVE_SETTING]);
  let atual = {};
  try {
    atual = linhas.length ? JSON.parse(linhas[0].value) : {};
  } catch { atual = {}; }

  const config = mesclarConfig({
    ...atual,
    ...OUTROS,
    regioes: { ...(atual.regioes || {}), ...REGIOES },
    embalagens: EMBALAGENS,
  });

  await conn.query(
    'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
    [CHAVE_SETTING, JSON.stringify(config)]
  );

  console.log('Embalagens gravadas:');
  for (const e of config.embalagens) {
    const vol = e.length_cm * e.width_cm * e.height_cm;
    const cubado = config.divisor_cubagem > 0 ? (vol / config.divisor_cubagem).toFixed(2) : '—';
    console.log(`  ${e.nome.padEnd(16)} ${e.length_cm}x${e.width_cm}x${e.height_cm} cm  |  vazia ${e.peso_g} g  |  cubada ${cubado} kg`);
  }

  console.log('\nPreço por região (pedido até o peso base):');
  for (const [chave, r] of Object.entries(config.regioes)) {
    console.log(`  ${chave.padEnd(14)} ${real(r.base).padStart(10)}  + ${real(r.kg_extra)}/kg  |  ${r.prazo_dias} dias`);
  }

  console.log(`\nCubagem: 1 kg a cada ${config.divisor_cubagem} cm³ (0 = desligada)`);
  console.log(`Peso base: ${config.peso_base_g} g   |   Peso padrão: ${config.peso_padrao_g} g`);
  const zerado = Object.values(config.regioes).every(r => r.base === 0 && r.kg_extra === 0);
  console.log(zerado
    ? '\nTabela ZERADA: a loja segue cobrando frete zero. Preencha os valores em REGIOES (scripts/definir-frete.js) ou em /admin/configuracoes.'
    : '\nConfira os valores em /admin/configuracoes antes de divulgar a loja.');

  await conn.end();
}

main().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
