import Link from 'next/link';
import { getDb } from '@/lib/db';

async function getOrders() {
  try {
    const db = await getDb();
    const orders = await db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    const stmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    return orders.map(o => ({ ...o, shipping_address: JSON.parse(o.shipping_address || '{}'), items: stmt.all(o.id) }));
  } catch { return []; }
}

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

export default async function AdminPedidosPage({ searchParams }) {
  const orders = await getOrders();
  const filterStatus = searchParams?.status || '';

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Link href="/admin/pedidos" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterStatus ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Todos</Link>
        {Object.entries(statusLabels).map(([key, label]) => (
          <Link key={key} href={`/admin/pedidos?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterStatus === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</Link>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="p-4 font-medium">Pedido</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4 font-medium">Pagamento</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Data</th>
              </tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4"><Link href={`/admin/pedidos/${o.id}`} className="text-primary-600 hover:text-primary-700 font-medium">#{o.order_id}</Link></td>
                    <td className="p-4 text-gray-700">{o.customer_name}</td>
                    <td className="p-4 font-medium">{Number(o.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="p-4 text-gray-600 capitalize">{o.payment_method}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[o.status] || o.status}</span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Nenhum pedido encontrado.</p>
        </div>
      )}
    </div>
  );
}