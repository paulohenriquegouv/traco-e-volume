import Link from 'next/link';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function safeQuery(fn, fallback) {
  try { return await fn(); }
  catch (e) { console.error('Dashboard query error:', e.message); return fallback; }
}

async function getStats() {
  const db = await getDb();

  const products = await safeQuery(async () => (await db.prepare('SELECT COUNT(*) as c FROM products').get()).c, 0);
  const activeProducts = await safeQuery(async () => (await db.prepare('SELECT COUNT(*) as c FROM products WHERE active = 1').get()).c, 0);
  const orders = await safeQuery(async () => (await db.prepare('SELECT COUNT(*) as c FROM orders').get()).c, 0);
  const pending = await safeQuery(async () => (await db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'aguardando_pagamento'").get()).c, 0);
  const totalRevenue = await safeQuery(async () => (await db.prepare("SELECT COALESCE(SUM(total), 0) as t FROM orders WHERE status IN ('pago', 'enviado', 'entregue', 'em_processamento')").get()).t, 0);
  const recentOrders = await safeQuery(async () => {
    const rows = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
    return rows.map(o => ({ ...o, shipping_address: JSON.parse(o.shipping_address || '{}') }));
  }, []);

  return { products, activeProducts, orders, pending, totalRevenue, recentOrders };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const statusLabels = {
    aguardando_pagamento: 'Aguardando Pagamento',
    pago: 'Pago',
    em_processamento: 'Em Processamento',
    enviado: 'Enviado',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  const statusColors = {
    aguardando_pagamento: 'bg-yellow-100 text-yellow-700',
    pago: 'bg-green-100 text-green-700',
    em_processamento: 'bg-blue-100 text-blue-700',
    enviado: 'bg-purple-100 text-purple-700',
    entregue: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Total de Produtos</p>
          <p className="text-3xl font-bold text-gray-900">{stats.products}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.activeProducts} ativos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Pedidos</p>
          <p className="text-3xl font-bold text-gray-900">{stats.orders}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.pending} aguardando pagamento</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Receita</p>
          <p className="text-3xl font-bold text-gray-900">{Number(stats.totalRevenue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Ações Rápidas</p>
          <div className="flex flex-col gap-2 mt-2">
            <Link href="/admin/produtos/novo" className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Novo Produto</Link>
            <Link href="/admin/pedidos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver Pedidos</Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Pedidos Recentes</h3>
          <Link href="/admin/pedidos" className="text-sm text-primary-600 hover:text-primary-700">Ver Todos</Link>
        </div>

        {stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Pedido</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Valor</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/pedidos/${o.id}`} className="text-primary-600 hover:text-primary-700 font-medium">#{o.order_id}</Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{o.customer_name}</td>
                    <td className="py-3 pr-4 font-medium">{Number(o.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm py-8 text-center">Nenhum pedido ainda.</p>
        )}
      </div>
    </div>
  );
}