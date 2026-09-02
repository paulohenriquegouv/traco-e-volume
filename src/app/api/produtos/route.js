import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkAuth } from '@/lib/auth';

// GET /api/produtos — Listar produtos (público)
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('categoria') || '';
    const featured = searchParams.get('destaque') || '';
    const search = searchParams.get('busca') || '';
    const page = parseInt(searchParams.get('pagina') || '1');
    const limit = parseInt(searchParams.get('limite') || '12');
    const offset = (page - 1) * limit;

    let whereConditions = ['active = 1'];
    let params = [];

    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    if (featured === 'true') {
      whereConditions.push('featured = 1');
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const total = await db.prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`).get(...params).count;
    const products = await db.prepare(
      `SELECT * FROM products ${whereClause} ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    // Parse JSON fields
    const parsed = products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      tags: JSON.parse(p.tags || '[]'),
      colors: JSON.parse(p.colors || '[]'),
    }));

    return NextResponse.json({
      products: parsed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return NextResponse.json({ error: 'Erro interno ao listar produtos' }, { status: 500 });
  }
}

// POST /api/produtos — Criar produto (admin)
export async function POST(request) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDb();
    const data = await request.json();

    // Gera slug a partir do nome
    const slug = data.slug || data.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Verifica slug único
    const existing = await db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (existing) {
      return NextResponse.json({ error: 'Já existe um produto com este slug' }, { status: 400 });
    }

    const result = await db.prepare(`
      INSERT INTO products (name, slug, description, short_description, price, compare_price, images, category, tags, weight, dimensions, material, colors, stock, featured, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      slug,
      data.description || '',
      data.short_description || '',
      data.price || 0,
      data.compare_price || null,
      JSON.stringify(data.images || []),
      data.category || '',
      JSON.stringify(data.tags || []),
      data.weight || null,
      data.dimensions || '',
      data.material || '',
      JSON.stringify(data.colors || []),
      data.stock || 0,
      data.featured ? 1 : 0,
      data.active !== false ? 1 : 0,
    );

    const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({
      ...product,
      images: JSON.parse(product.images || '[]'),
      tags: JSON.parse(product.tags || '[]'),
      colors: JSON.parse(product.colors || '[]'),
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json({ error: 'Erro interno ao criar produto' }, { status: 500 });
  }
}