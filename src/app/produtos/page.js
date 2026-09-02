import Link from 'next/link';
import { getDb } from '@/lib/db';
import ProductCard from '@/components/ProductCard';

async function getProducts(searchParams) {
  try {
    const db = await getDb();
    const categoria = searchParams?.categoria || '';
    const busca = searchParams?.busca || '';
    const pagina = parseInt(searchParams?.pagina || '1');
    const limit = 12;
    const offset = (pagina - 1) * limit;

    let where = ['active = 1'];
    let params = [];

    if (categoria) { where.push('category = ?'); params.push(categoria); }
    if (busca) { where.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${busca}%`, `%${busca}%`); }

    const w = `WHERE ${where.join(' AND ')}`;
    const total = await db.prepare(`SELECT COUNT(*) as count FROM products ${w}`).get(...params).count;
    const products = await db.prepare(`SELECT * FROM products ${w} ORDER BY featured DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const categories = await db.prepare("SELECT category, COUNT(*) as count FROM products WHERE active = 1 AND category != '' GROUP BY category ORDER BY count DESC").all();

    return {
      products: products.map(p => ({ ...p, images: JSON.parse(p.images || '[]') })),
      categories,
      pagination: { pagina, total, totalPages: Math.ceil(total / limit) },
    };
  } catch { return { products: [], categories: [], pagination: { pagina: 1, total: 0, totalPages: 0 } }; }
}

export default async function ProdutosPage({ searchParams }) {
  const { products, categories, pagination } = await getProducts(searchParams);
  const cat = searchParams?.categoria || '';
  const busca = searchParams?.busca || '';

  return (
    <div className="container-custom py-8 md:py-12">
      <div className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-primary-600">Início</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">Produtos</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Produtos</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Categorias</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/produtos" className={`text-sm ${!cat ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>Todas</Link>
              </li>
              {categories.map(c => (
                <li key={c.category}>
                  <Link href={`/produtos?categoria=${encodeURIComponent(c.category)}`}
                    className={`text-sm ${cat === c.category ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                    {c.category.charAt(0).toUpperCase() + c.category.slice(1)} ({c.count})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {busca && <p className="text-sm text-gray-500 mb-4">Resultados para: <span className="font-medium text-gray-900">"{busca}"</span></p>}
{products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                    <Link key={p} href={`/produtos?pagina=${p}${cat ? `&categoria=${encodeURIComponent(cat)}` : ''}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${p === pagination.pagina ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>{p}</Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Tente buscar por outra categoria ou termo.</p>
              <Link href="/produtos" className="mt-4 inline-block bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Limpar Filtros</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}