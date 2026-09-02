import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';

// GET /api/pedidos — Listar pedidos (admin)
export async function GET(request) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('pagina') || '1');
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limite') || '20');
    const offset = (page - 1) * limit;

    let where = '';
    let params = [];

    if (status) {
      where = 'WHERE status = ?';
      params.push(status);
    }

    const total = await db.prepare(`SELECT COUNT(*) as count FROM orders ${where}`).get(...params).count;
    const orders = await db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

    // Busca itens de cada pedido
    const stmt = await db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const ordersWithItems = await Promise.all(orders.map(async o => ({
      ...o,
      shipping_address: JSON.parse(o.shipping_address || '{}'),
      items: await stmt.all(o.id),
    })));

    return NextResponse.json({
      orders: ordersWithItems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/pedidos — Buscar pedido por e-mail ou ID (público)
export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { email, order_id } = body;

    if (!email && !order_id) {
      return NextResponse.json({ error: 'Informe e-mail ou número do pedido' }, { status: 400 });
    }

    let order;
    if (order_id) {
      order = await db.prepare('SELECT * FROM orders WHERE order_id = ?').get(order_id);
    } else {
      order = await db.prepare('SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC LIMIT 1').get(email);
    }

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