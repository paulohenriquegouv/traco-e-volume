import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getDb } from '@/lib/db';
import { LOG, validarAssinatura, processarPagamento } from '@/lib/webhook-mp';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let corpo = {};
  try {
    const texto = await request.text();
    if (texto) corpo = JSON.parse(texto);
  } catch {
    corpo = {};
  }

  const { searchParams } = new URL(request.url);
  // Formato novo (webhooks) e antigo (IPN) chegam com nomes diferentes
  const tipo = corpo.type || corpo.topic || searchParams.get('type') || searchParams.get('topic') || '';
  const dataId = corpo.data?.id || corpo.resource || searchParams.get('data.id') || searchParams.get('id') || '';

  if (tipo !== 'payment') {
    return NextResponse.json({ ignorado: true, tipo }, { status: 200 });
  }
  if (!dataId) {
    return NextResponse.json({ erro: 'data.id ausente' }, { status: 400 });
  }

  const check = validarAssinatura({
    assinatura: request.headers.get('x-signature') || '',
    requestId: request.headers.get('x-request-id') || '',
    dataId,
    secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  });
  if (!check.ok) {
    console.warn(`${LOG} assinatura rejeitada (${check.motivo}) payment=${dataId}`);
    return NextResponse.json({ erro: 'assinatura invalida' }, { status: 401 });
  }

  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error(`${LOG} MERCADO_PAGO_ACCESS_TOKEN nao configurado`);
      return NextResponse.json({ erro: 'MP nao configurado' }, { status: 500 });
    }

    // Fonte da verdade é a API do MP, nunca o corpo da notificação
    const client = new MercadoPagoConfig({ accessToken });
    let pagamento;
    try {
      pagamento = await new Payment(client).get({ id: String(dataId) });
    } catch (e) {
      const status = e?.status || e?.statusCode;
      if (status === 404) {
        console.warn(`${LOG} pagamento ${dataId} nao existe no MP — ignorando`);
        return NextResponse.json({ ignorado: true, motivo: 'pagamento inexistente' }, { status: 200 });
      }
      throw e;
    }

    const db = await getDb();
    const { http, corpo: resposta } = await processarPagamento(db, pagamento, dataId);
    return NextResponse.json(resposta, { status: http });
  } catch (error) {
    // 500 faz o Mercado Pago reenviar a notificação depois
    console.error(`${LOG} erro ao processar payment=${dataId}:`, error?.message || error);
    return NextResponse.json({ erro: 'Erro ao processar webhook' }, { status: 500 });
  }
}

// O Mercado Pago faz uma chamada de teste ao salvar a URL no painel
export async function GET() {
  return NextResponse.json({ ok: true, servico: 'webhook mercadopago' }, { status: 200 });
}
