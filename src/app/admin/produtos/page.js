import Link from 'next/link';
import { getDb } from '@/lib/db';

async function getProducts() {
  try {
    const db = await getDb();
    const products = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    return products.map(p => ({ ...p, images: JSON.parse(p.images || '[]') }));
  } catch { return []; }
}

export default async function AdminProdutosPage() {
  const products = await getProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <Link href="/admin/produtos/novo" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Novo Produto</Link>
      </div>

      {products.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="p-4 font-medium">Produto</th>
                <th className="p-4 font-medium">Preço</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium">Estoque</th>
                <th className="p-4 font-medium">Destaque</th>
                <th className="p-4 font-medium">Ativo</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                        <img src={p.images?.[0] || '/placeholder.svg'} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium">{Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="p-4 text-gray-600 capitalize">{p.category || '—'}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4">{p.featured ? '⭐ Sim' : '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/produtos/${p.id}/editar`} className="text-primary-600 hover:text-primary-700 font-medium">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Nenhum produto cadastrado.</p>
          <Link href="/admin/produtos/novo" className="mt-4 inline-block text-primary-600 font-medium">+ Criar primeiro produto</Link>
        </div>
      )}
    </div>
  );
}