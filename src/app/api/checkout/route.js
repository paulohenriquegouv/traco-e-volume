import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getDb } from '@/lib/db';
import { generateOrderId } from '@/lib/auth';

// CPF/CNPJ chega formatado do formulario; o MP so aceita digitos
function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

// Confere os digitos verificadores. Sem isto, um "00000000000" so seria recusado
// la no Mercado Pago, com mensagem generica.
function cpfValido(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const [fatorInicial, digito] of [[10, 9], [11, 10]]) {
    let soma = 0;
    for (let i = 0; i < digito; i++) soma += Number(cpf[i]) * (fatorInicial - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== Number(cpf[digito])) return false;
  }
  return true;
}

function cnpjValido(cnpj) {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (tamanho) => {
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

function documentoValido(doc) {
  return doc.length === 11 ? cpfValido(doc) : doc.length === 14 ? cnpjValido(doc) : false;
}

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
    const partesNome = body.customer_name.trim().split(/\s+/);
    // O MP recusa sobrenome vazio no boleto; repetir o primeiro nome e o fallback usual
    const payer = { email: body.customer_email, first_name: partesNome[0], last_name: partesNome.slice(1).join(' ') || partesNome[0] };

    if (method === 'pix') {
      const r = await new Payment(client).create({ body: { transaction_amount: total, description: 'Pedido ' + orderId + ' - Traço & Volume', payment_method_id: 'pix', payer, external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'pix', r.id, total);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'pix', qr_code: r.point_of_interaction?.transaction_data?.qr_code || '', qr_code_base64: r.point_of_interaction?.transaction_data?.qr_code_base64 || '', ticket_url: r.point_of_interaction?.transaction_data?.ticket_url || '', status: r.status });
    }

    if (method === 'boleto') {
      // O boleto exige CPF/CNPJ real e endereco completo do pagador; sem isso o MP recusa
      const doc = onlyDigits(body.customer_document);
      if (!documentoValido(doc)) {
        return NextResponse.json({ error: 'Para pagar com boleto, informe um CPF ou CNPJ válido.' }, { status: 400 });
      }
      const end = body.shipping_address || {};
      const cep = onlyDigits(end.zip);
      if (cep.length !== 8 || !end.address?.trim() || !end.city?.trim() || !end.state?.trim()) {
        return NextResponse.json({ error: 'Para pagar com boleto, preencha endereço, cidade, estado e CEP.' }, { status: 400 });
      }
      payer.identification = { type: doc.length === 11 ? 'CPF' : 'CNPJ', number: doc };
      payer.address = {
        zip_code: cep,
        street_name: end.address,
        street_number: end.number || 'S/N',
        neighborhood: end.neighborhood || end.city,
        ...(end.complement ? { complement: end.complement } : {}),
        city: end.city,
        federal_unit: end.state.toUpperCase().slice(0, 2),
      };
      const r = await new Payment(client).create({ body: { transaction_amount: total, description: 'Pedido ' + orderId + ' - Traço & Volume', payment_method_id: 'bolbradesco', payer, external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'boleto', r.id, total);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'boleto', boleto_url: r.transaction_details?.external_resource_url || '', boleto_barcode: r.barcode?.content || '', status: r.status });
    }

    if (method === 'card') {
      const doc = onlyDigits(body.customer_document);
      if (documentoValido(doc)) {
        payer.identification = { type: doc.length === 11 ? 'CPF' : 'CNPJ', number: doc };
      }
      const r = await new Payment(client).create({ body: { transaction_amount: total, installments: body.installments || 1, token: body.card_token, payment_method_id: body.card_method_id, issuer_id: body.card_issuer_id || undefined, payer, description: 'Pedido ' + orderId + ' - Traço & Volume', external_reference: orderId, notification_url: process.env.NEXT_PUBLIC_SITE_URL + '/api/webhooks/mercadopago' } });
      // Cartao responde na hora: recusa vira pedido cancelado, nao "aguardando pagamento"
      const recusado = r.status === 'rejected' || r.status === 'cancelled';
      const statusPedido = r.status === 'approved' ? 'pago' : recusado ? 'cancelado' : 'aguardando_pagamento';
      const statusPagamento = r.status === 'approved' ? 'approved' : recusado ? r.status : 'pending';
      await saveOrder(db, orderId, body, body.shipping_address || {}, 'card', r.id, total);
      await db.prepare('UPDATE orders SET payment_status = ?, status = ? WHERE order_id = ?').run(statusPagamento, statusPedido, orderId);
      await saveOrderItems(db, orderId, body.items);
      return NextResponse.json({ success: true, order_id: orderId, payment_id: r.id, payment_method: 'card', status: r.status, status_detail: r.status_detail, installments: r.installments });
    }

    return NextResponse.json({ error: 'Método inválido' }, { status: 400 });
  } catch (error) {
    console.error('Erro checkout:', error?.message, JSON.stringify(error?.cause || {}));
    // A causa do MP diz o que faltou, mas em ingles e em jargao. Traduz o que o
    // cliente pode resolver sozinho; o resto vai como veio.
    const motivo = error?.cause?.[0]?.description || error?.cause?.error?.causes?.[0]?.description || error?.message || '';
    const traducoes = [
      [/invalid transaction_amount/i, 'O valor do pedido é baixo demais para boleto. Use Pix ou cartão para valores pequenos.'],
      [/collector.*(not allowed|cannot).*payer|payer.*(is|equals).*collector/i, 'Não é possível pagar uma compra da sua própria loja. Use outro cartão ou conta.'],
      [/invalid users involved/i, 'Não é possível pagar uma compra da sua própria loja. Use outro cartão ou conta.'],
      [/invalid parameter zip_code|zip_code/i, 'CEP inválido. Confira o CEP informado.'],
      [/invalid parameter identification|identification/i, 'CPF/CNPJ inválido. Confira o documento informado.'],
      [/invalid card token|card_token/i, 'Os dados do cartão expiraram. Preencha o cartão novamente.'],
      [/(email|payer.email)/i, 'E-mail inválido. Confira o endereço informado.'],
    ];
    const amigavel = traducoes.find(([re]) => re.test(motivo))?.[1];
    return NextResponse.json({
      error: amigavel || (motivo ? 'Pagamento recusado: ' + motivo : 'Erro ao processar pagamento'),
      details: error.message,
    }, { status: 500 });
  }
}