import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { clienteAtual } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

/**
 * Pedidos do cliente logado.
 *
 * Filtra por customer_id, nunca por e-mail: buscar por e-mail deixaria o
 * histórico exposto a quem apenas soubesse o endereço de outra pessoa.
 */
export async function GET(request) {
  const cliente = await clienteAtual(request);
  if (!cliente) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const db = await getDb();

  if (id) {
    const pedido = await db.prepare(
      'SELECT * FROM orders WHERE order_id = ? AND customer_id = ?'
    ).get(id, cliente.id);
    if (!pedido) return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 });

    const itens = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(pedido.id);
    return NextResponse.json({
      pedido: { ...pedido, shipping_address: JSON.parse(pedido.shipping_address || '{}'), itens },
    });
  }

  const pedidos = await db.prepare(
    `SELECT order_id, total, status, payment_method, payment_status, created_at
     FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(cliente.id);

  return NextResponse.json({ pedidos });
}
