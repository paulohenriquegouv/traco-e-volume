import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';

// GET /api/pedidos/[id] — Detalhe do pedido (admin)
export async function GET(request, { params }) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? OR order_id = ?').get(parseInt(params.id) || params.id, params.id);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    return NextResponse.json({
      ...order,
      shipping_address: JSON.parse(order.shipping_address || '{}'),
      items,
    });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/pedidos/[id] — Atualizar status do pedido (admin)
export async function PUT(request, { params }) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const data = await request.json();
    const id = parseInt(params.id);

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    await db.prepare("UPDATE orders SET status = ?, notes = ? WHERE id = ?").run(
      data.status ?? order.status,
      data.notes ?? order.notes,
      id,
    );

    const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(updated.id);

    return NextResponse.json({
      ...updated,
      shipping_address: JSON.parse(updated.shipping_address || '{}'),
      items,
    });
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}