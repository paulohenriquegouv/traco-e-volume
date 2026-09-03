/**
 * Teste da lógica do webhook do Mercado Pago com um banco falso em memória.
 * Não toca no banco real. Rodar com: node scripts/teste-webhook.js
 */
const crypto = require('crypto');
const { validarAssinatura, processarPagamento } = require('../src/lib/webhook-mp');

// Silencia os logs da lógica para a saída do teste ficar limpa
console.log = () => {};
console.warn = () => {};
const saida = [];
const print = (...a) => saida.push(a.join(' '));

// ---------- banco falso ----------
function criarDbFalso({ pedido, itens = [], produtos = {} }) {
  const estado = { pedido: pedido ? { ...pedido } : null, itens, produtos: { ...produtos } };
  const db = {
    estado,
    prepare(sql) {
      return {
        async get(...p) {
          if (sql.includes('FROM orders WHERE order_id = ?')) {
            return estado.pedido && estado.pedido.order_id === p[0] ? { ...estado.pedido } : null;
          }
          if (sql.includes('FROM orders WHERE payment_id = ?')) {
            return estado.pedido && String(estado.pedido.payment_id) === String(p[0]) ? { ...estado.pedido } : null;
          }
          return null;
        },
        async all(...p) {
          if (sql.includes('FROM order_items')) {
            return estado.itens.filter(i => i.order_id === p[0] && i.product_id != null);
          }
          return [];
        },
        async run(...p) {
          // UPDATE condicional (só aplica se ainda não estava approved)
          if (sql.includes('UPDATE orders') && sql.includes("payment_status <> 'approved'")) {
            const [ps, st, pid, oid] = p;
            if (!estado.pedido || estado.pedido.order_id !== oid) return { changes: 0 };
            if (estado.pedido.payment_status === 'approved') return { changes: 0 };
            Object.assign(estado.pedido, { payment_status: ps, status: st, payment_id: pid });
            return { changes: 1 };
          }
          if (sql.includes('UPDATE orders')) {
            const [ps, st, pid, oid] = p;
            if (!estado.pedido || estado.pedido.order_id !== oid) return { changes: 0 };
            Object.assign(estado.pedido, { payment_status: ps, status: st, payment_id: pid });
            return { changes: 1 };
          }
          if (sql.includes('UPDATE products')) {
            const [qtd, pid] = p;
            estado.produtos[pid] = Math.max((estado.produtos[pid] ?? 0) - qtd, 0); // GREATEST(...,0)
            return { changes: 1 };
          }
          return { changes: 0 };
        },
      };
    },
  };
  return db;
}

const pedidoBase = {
  id: 1, order_id: 'TV2026090100001', payment_id: '111', status: 'aguardando_pagamento',
  payment_status: 'pending', customer_email: 'cliente@teste.com', total: 150,
};
const itensBase = [
  { order_id: 1, product_id: 10, quantity: 2 },
  { order_id: 1, product_id: 11, quantity: 1 },
];
const produtosBase = { 10: 5, 11: 3 };

// ---------- runner ----------
let ok = 0, falhou = 0;
function checar(nome, condicao, detalhe = '') {
  if (condicao) { ok++; print(`  OK   ${nome}`); }
  else { falhou++; print(`  FALHA ${nome} ${detalhe}`); }
}

async function main() {
  print('\n=== TRANSICOES DE STATUS ===');

  // 1. Pix aprovado
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    const r = await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    checar('pagamento aprovado marca pedido como pago', db.estado.pedido.status === 'pago', `-> ${db.estado.pedido.status}`);
    checar('payment_status vira approved', db.estado.pedido.payment_status === 'approved');
    checar('responde novo=true', r.corpo.novo === true);
    checar('estoque do produto 10 baixa de 5 para 3', db.estado.produtos[10] === 3, `-> ${db.estado.produtos[10]}`);
    checar('estoque do produto 11 baixa de 3 para 2', db.estado.produtos[11] === 2, `-> ${db.estado.produtos[11]}`);
  }

  // 2. Idempotência — MP reenvia a mesma notificação
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    const estoqueApos1 = { ...db.estado.produtos };
    const r2 = await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    checar('reenvio responde novo=false', r2.corpo.novo === false);
    checar('reenvio NAO baixa estoque de novo',
      db.estado.produtos[10] === estoqueApos1[10] && db.estado.produtos[11] === estoqueApos1[11],
      `-> ${JSON.stringify(db.estado.produtos)}`);
  }

  // 3. Não rebaixa pedido já despachado
  {
    const db = criarDbFalso({ pedido: { ...pedidoBase, status: 'enviado', payment_status: 'approved' }, itens: itensBase, produtos: produtosBase });
    await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    checar('pedido "enviado" permanece enviado', db.estado.pedido.status === 'enviado', `-> ${db.estado.pedido.status}`);
    checar('pedido "enviado" nao baixa estoque de novo', db.estado.produtos[10] === 5);
  }

  // 4. Admin já moveu para em_processamento e chega notificação pending
  {
    const db = criarDbFalso({ pedido: { ...pedidoBase, status: 'em_processamento', payment_status: 'approved' }, itens: itensBase, produtos: produtosBase });
    await processarPagamento(db, { status: 'pending', external_reference: 'TV2026090100001' }, '111');
    checar('nao rebaixa em_processamento para aguardando_pagamento', db.estado.pedido.status === 'em_processamento', `-> ${db.estado.pedido.status}`);
  }

  // 5. Recusado / cancelado / estornado
  for (const [statusMp, esperado] of [['rejected', 'cancelado'], ['cancelled', 'cancelado'], ['refunded', 'cancelado'], ['charged_back', 'cancelado']]) {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    await processarPagamento(db, { status: statusMp, external_reference: 'TV2026090100001' }, '111');
    checar(`${statusMp} -> ${esperado}`, db.estado.pedido.status === esperado, `-> ${db.estado.pedido.status}`);
    checar(`${statusMp} nao baixa estoque`, db.estado.produtos[10] === 5);
  }

  // 6. Pendente segue aguardando
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    await processarPagamento(db, { status: 'in_process', external_reference: 'TV2026090100001' }, '111');
    checar('in_process segue aguardando_pagamento', db.estado.pedido.status === 'aguardando_pagamento');
  }

  print('\n=== CASOS DE BORDA ===');

  // 7. Pedido não encontrado
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    const r = await processarPagamento(db, { status: 'approved', external_reference: 'TV_INEXISTENTE' }, '999');
    checar('pedido inexistente responde 200 ignorado', r.http === 200 && r.corpo.ignorado === true);
    checar('pedido inexistente nao altera estoque', db.estado.produtos[10] === 5);
  }

  // 8. Fallback: acha pelo payment_id quando não veio external_reference
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    const r = await processarPagamento(db, { status: 'approved', external_reference: '' }, '111');
    checar('acha pedido pelo payment_id sem external_reference', r.corpo.ok === true && db.estado.pedido.status === 'pago');
  }

  // 9. Status desconhecido do MP
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: itensBase, produtos: produtosBase });
    const r = await processarPagamento(db, { status: 'status_novo_do_mp', external_reference: 'TV2026090100001' }, '111');
    checar('status desconhecido e ignorado sem quebrar', r.http === 200 && r.corpo.ignorado === true);
    checar('status desconhecido nao altera pedido', db.estado.pedido.status === 'aguardando_pagamento');
  }

  // 10. Estoque não fica negativo
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: [{ order_id: 1, product_id: 10, quantity: 99 }], produtos: { 10: 5 } });
    await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    checar('estoque nao fica negativo', db.estado.produtos[10] === 0, `-> ${db.estado.produtos[10]}`);
  }

  // 11. Item sem product_id (produto excluído) não quebra
  {
    const db = criarDbFalso({ pedido: pedidoBase, itens: [{ order_id: 1, product_id: null, quantity: 2 }], produtos: { 10: 5 } });
    const r = await processarPagamento(db, { status: 'approved', external_reference: 'TV2026090100001' }, '111');
    checar('item com product_id nulo nao quebra', r.corpo.ok === true && db.estado.pedido.status === 'pago');
  }

  print('\n=== ASSINATURA HMAC ===');
  {
    const secret = 'segredo_de_teste';
    const dataId = '123456';
    const requestId = 'req-abc';
    const ts = '1700000000';
    const v1 = crypto.createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');

    checar('assinatura correta e aceita',
      validarAssinatura({ assinatura: `ts=${ts},v1=${v1}`, requestId, dataId, secret }).ok === true);
    checar('assinatura errada e rejeitada',
      validarAssinatura({ assinatura: `ts=${ts},v1=${'0'.repeat(64)}`, requestId, dataId, secret }).ok === false);
    checar('assinatura ausente e rejeitada',
      validarAssinatura({ assinatura: '', requestId, dataId, secret }).ok === false);
    checar('x-signature malformado e rejeitado',
      validarAssinatura({ assinatura: 'lixo', requestId, dataId, secret }).ok === false);
    checar('v1 de tamanho diferente nao quebra o timingSafeEqual',
      validarAssinatura({ assinatura: `ts=${ts},v1=abc`, requestId, dataId, secret }).ok === false);
    checar('id maiusculo normaliza para minusculo',
      validarAssinatura({
        assinatura: `ts=${ts},v1=${crypto.createHmac('sha256', secret).update(`id:abc123;request-id:${requestId};ts:${ts};`).digest('hex')}`,
        requestId, dataId: 'ABC123', secret,
      }).ok === true);
    checar('sem secret configurado passa (status vem da API do MP)',
      validarAssinatura({ assinatura: '', requestId, dataId, secret: '' }).ok === true);
  }

  print(`\n${ok} passaram, ${falhou} falharam`);
  process.stdout.write(saida.join('\n') + '\n');
  process.exit(falhou > 0 ? 1 : 0);
}

main();
