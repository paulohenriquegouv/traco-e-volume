const crypto = require('crypto');

const LOG = '[webhook-mp]';

// Status que já passaram do pagamento — o webhook nunca rebaixa um pedido nesses estados
const STATUS_AVANCADOS = ['em_processamento', 'enviado', 'entregue'];

// Mapa status do Mercado Pago -> status do pedido na loja.
// pedido: null significa "não mexe no status do pedido, só no payment_status"
const MAPA_STATUS = {
  approved:     { pedido: 'pago' },
  authorized:   { pedido: null },
  pending:      { pedido: 'aguardando_pagamento' },
  in_process:   { pedido: 'aguardando_pagamento' },
  in_mediation: { pedido: null },
  rejected:     { pedido: 'cancelado' },
  cancelled:    { pedido: 'cancelado' },
  refunded:     { pedido: 'cancelado' },
  charged_back: { pedido: 'cancelado' },
};

// Valida a assinatura HMAC do Mercado Pago.
// Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
function validarAssinatura({ assinatura, requestId, dataId, secret }) {
  // Sem secret configurado seguimos em frente: o status real é sempre relido da API
  // do Mercado Pago, então um corpo forjado não consegue marcar um pedido como pago.
  if (!secret) return { ok: true, motivo: 'secret-nao-configurado' };
  if (!assinatura) return { ok: false, motivo: 'x-signature ausente' };

  let ts = '';
  let v1 = '';
  for (const parte of String(assinatura).split(',')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    const chave = parte.slice(0, i).trim();
    const valor = parte.slice(i + 1).trim();
    if (chave === 'ts') ts = valor;
    else if (chave === 'v1') v1 = valor;
  }
  if (!ts || !v1) return { ok: false, motivo: 'x-signature malformado' };

  // IDs alfanuméricos entram no manifest em minúsculas; partes vazias são omitidas
  const id = String(dataId ?? '').toLowerCase();
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(String(v1), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, motivo: 'assinatura invalida' };
  }
  return { ok: true, motivo: 'assinatura valida' };
}

// Dá baixa no estoque dos itens do pedido. Chamado só na transição para "pago".
async function baixarEstoque(db, orderRowId) {
  const itens = await db.prepare(
    'SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL'
  ).all(orderRowId);
  const stmt = db.prepare('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?');
  for (const item of itens) {
    await stmt.run(item.quantity, item.product_id);
  }
  return itens.length;
}

// Aplica um pagamento (já lido da API do MP) ao pedido correspondente.
// Recebe o pagamento pronto para poder ser testado sem chamar o Mercado Pago.
async function processarPagamento(db, pagamento, dataId) {
  const statusMp = pagamento?.status || '';
  const referencia = pagamento?.external_reference || '';

  let pedido = null;
  if (referencia) {
    pedido = await db.prepare('SELECT * FROM orders WHERE order_id = ?').get(referencia);
  }
  if (!pedido) {
    pedido = await db.prepare('SELECT * FROM orders WHERE payment_id = ?').get(String(dataId));
  }
  if (!pedido) {
    console.warn(`${LOG} pedido nao encontrado (ref=${referencia} payment=${dataId})`);
    return { http: 200, corpo: { ignorado: true, motivo: 'pedido nao encontrado' } };
  }

  const mapa = MAPA_STATUS[statusMp];
  if (!mapa) {
    console.warn(`${LOG} status MP desconhecido "${statusMp}" pedido=${pedido.order_id}`);
    return { http: 200, corpo: { ignorado: true, motivo: 'status desconhecido' } };
  }

  // Nunca rebaixa um pedido que o admin já moveu adiante
  const jaAvancado = STATUS_AVANCADOS.includes(pedido.status);
  let statusPedido = pedido.status;
  if (mapa.pedido && !jaAvancado) statusPedido = mapa.pedido;

  if (statusMp === 'approved') {
    // UPDATE condicional: só uma notificação consegue fazer a transição, mesmo
    // que o MP reenvie a mesma várias vezes em paralelo
    const r = await db.prepare(
      "UPDATE orders SET payment_status = ?, status = ?, payment_id = ? WHERE order_id = ? AND payment_status <> 'approved'"
    ).run('approved', statusPedido, String(dataId), pedido.order_id);

    if (r.changes > 0) {
      const n = await baixarEstoque(db, pedido.id);
      console.log(`${LOG} pedido ${pedido.order_id} PAGO — estoque baixado em ${n} item(ns)`);
      return { http: 200, corpo: { ok: true, pedido: pedido.order_id, status: statusPedido, novo: true } };
    }
    return { http: 200, corpo: { ok: true, pedido: pedido.order_id, status: pedido.status, novo: false } };
  }

  if (pedido.payment_status === statusMp && pedido.status === statusPedido) {
    return { http: 200, corpo: { ok: true, pedido: pedido.order_id, status: pedido.status, novo: false } };
  }

  await db.prepare(
    'UPDATE orders SET payment_status = ?, status = ?, payment_id = ? WHERE order_id = ?'
  ).run(statusMp, statusPedido, String(dataId), pedido.order_id);

  console.log(`${LOG} pedido ${pedido.order_id}: ${statusMp} -> ${statusPedido}`);
  return { http: 200, corpo: { ok: true, pedido: pedido.order_id, status: statusPedido, novo: true } };
}

module.exports = { LOG, STATUS_AVANCADOS, MAPA_STATUS, validarAssinatura, baixarEstoque, processarPagamento };
