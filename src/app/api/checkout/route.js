import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getDb } from '@/lib/db';
import { generateOrderId } from '@/lib/auth';

async function saveOrder(db, orderId, body, address, method, paymentId, total) {
  const { customer_name, customer_email, customer_phone, customer_document } = body;
  await db.prepare('INSERT INTO orders (order_id, customer_name, customer_email, customer_phone, customer_document, shipping_address, payment_method, payment_id, payment_status, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    orderId, customer_name, customer_email, customer_phone || '', customer_document || '',
    JSON.stringify(address), method, paymentId, 'pending', total, 'aguardando_pagamento'
  );
}

async function saveOrderItems(db, orderId, items) {
  const order = await db.prepare('SELECT id FROM orders WHERE order_id = ?').get(orderId);
  const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)');
  for (const item of items) {
    await stmt.run(order.id, item.product_id || null, item.name, item.quantity, item.price, item.price * item.quantity);
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    if (!body.items?.length) return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
    if (!body.customer_name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    if (!body.customer_email?.trim()) return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });

    const orderId = generateOrderId();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ error: 'MP não configurado' }, { status: 500 });

    const client = new MercadoPagoConfig({ accessToken });
    const method = body.payment_method || 'pix';
    const total = body.items.reduce((s, i) => s + i.price * i.quantity, 0) + (body.shipping || 0);
    const payer = { email: body.customer_email, first_name: body.customer_name.split(' ')[0], last_name: body.customer_name.split(' ').slice(1).join(' ') || '' };

    if (method === 'pix') {
      const r = await new Payment(client).create({ body: { transaction_amount: total, description: 'Pedido ' + orderId + ' - Traço & Volume', payment_method_id: 'pix', payer, external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'pix', r.id, total);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'pix', qr_code: r.point_of_interaction?.transaction_data?.qr_code || '', qr_code_base64: r.point_of_interaction?.transaction_data?.qr_code_base64 || '', ticket_url: r.point_of_interaction?.transaction_data?.ticket_url || '', status: r.status });
    }

    if (method === 'boleto') {
      const doc = body.customer_document || '00000000000';
      payer.identification = { type: doc.length === 11 ? 'CPF' : 'CNPJ', number: doc };
      const r = await new Payment(client).create({ body: { transaction_amount: total, description: 'Pedido ' + orderId + ' - Traço & Volume', payment_method_id: 'bolbradesco', payer, external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'boleto', r.id, total);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'boleto', boleto_url: r.transaction_details?.external_resource_url || '', boleto_barcode: r.barcode?.content || '', status: r.status });
    }

    if (method === 'card') {
      const doc = body.customer_document || '00000000000';
      payer.identification = { type: doc.length === 11 ? 'CPF' : 'CNPJ', number: doc };
      const r = await new Payment(client).create({ body: { transaction_amount: total, installments: body.installments || 1, token: body.card_token, payment_method_id: body.card_method_id, issuer_id: body.card_issuer_id || undefined, payer, description: 'Pedido ' + orderId + ' - Traço & Volume', external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      const pago = r.status === 'approved';
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'card', r.id, total);
      await db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE order_id = ?').run(pago ? 'approved' : 'pending', pago ? 'pago' : 'aguardando_pagamento', orderId);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'card', status: r.status, status_detail: r.status_detail, installments: r.installments });
    }

    return NextResponse.json({ error: 'Método inválido' }, { status: 400 });
  } catch (error) {
    console.error('Erro checkout:', error);
    return NextResponse.json({ error: 'Erro ao processar pagamento', details: error.message }, { status: 500 });
  }
}