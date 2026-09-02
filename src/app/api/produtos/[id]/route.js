import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';

// GET /api/produtos/[id] — Obter produto por ID ou slug
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const identifier = params.id;

    // Pode ser ID numérico ou slug
    const isNumeric = /^\d+$/.test(identifier);
    const product = isNumeric
      ? await db.prepare('SELECT * FROM products WHERE id = ?').get(parseInt(identifier))
      : await db.prepare('SELECT * FROM products WHERE slug = ?').get(identifier);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      ...product,
      images: JSON.parse(product.images || '[]'),
      tags: JSON.parse(product.tags || '[]'),
      colors: JSON.parse(product.colors || '[]'),
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/produtos/[id] — Atualizar produto (admin)
export async function PUT(request, { params }) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const data = await request.json();
    const id = parseInt(params.id);

    const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    const slug = data.slug || existing.slug;
    if (slug !== existing.slug) {
      const slugExists = await db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, id);
      if (slugExists) {
        return NextResponse.json({ error: 'Slug já está em uso' }, { status: 400 });
      }
    }

    await db.prepare(`
      UPDATE products SET
        name = ?, slug = ?, description = ?, short_description = ?,
        price = ?, compare_price = ?, images = ?, category = ?,
        tags = ?, weight = ?, dimensions = ?, material = ?,
        colors = ?, stock = ?, featured = ?, active = ?
      WHERE id = ?
    `).run(
      data.name ?? existing.name,
      slug,
      data.description ?? existing.description,
      data.short_description ?? existing.short_description,
      data.price ?? existing.price,
      data.compare_price ?? existing.compare_price,
      JSON.stringify(data.images ?? JSON.parse(existing.images || '[]')),
      data.category ?? existing.category,
      JSON.stringify(data.tags ?? JSON.parse(existing.tags || '[]')),
      data.weight ?? existing.weight,
      data.dimensions ?? existing.dimensions,
      data.material ?? existing.material,
      JSON.stringify(data.colors ?? JSON.parse(existing.colors || '[]')),
      data.stock ?? existing.stock,
      data.featured !== undefined ? (data.featured ? 1 : 0) : existing.featured,
      data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      id,
    );

    const updated = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return NextResponse.json({
      ...updated,
      images: JSON.parse(updated.images || '[]'),
      tags: JSON.parse(updated.tags || '[]'),
      colors: JSON.parse(updated.colors || '[]'),
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/produtos/[id] — Excluir produto (admin)
export async function DELETE(request, { params }) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const id = parseInt(params.id);

    const existing = await db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    await db.prepare('DELETE FROM products WHERE id = ?').run(id);

    return NextResponse.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}