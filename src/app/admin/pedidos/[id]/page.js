import { getDb } from '@/lib/db';
import Link from 'next/link';
import OrderStatusForm from './OrderStatusForm';

async function getOrder(id) {
  try {
    const db = await getDb();
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? OR order_id = ?').get(parseInt(id) || id, id);
    if (!order) return null;
    const items = await db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, shipping_address: JSON.parse(order.shipping_address || '{}'), items };
  } catch { return null; }
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

export default async function AdminPedidoDetailPage({ params }) {
  const order = await getOrder(params.id);

  if (!order) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Pedido não encontrado</h1>
        <Link href="/admin/pedidos" className="text-primary-600 font-medium">← Voltar</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/pedidos" className="text-gray-400 hover:text-gray-600">← Voltar</Link>
        <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.order_id}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-500">Qtd: {item.quantity} x {Number(item.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <p className="font-bold">{Number(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold text-lg">
                <span>Total</span>
                <span>{Number(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
          </div>

          <OrderStatusForm order={order} />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Cliente</h3>
            <div className="text-sm space-y-2">
              <p><span className="text-gray-500">Nome:</span> <span className="font-medium">{order.customer_name}</span></p>
              <p><span className="text-gray-500">E-mail:</span> <span className="font-medium">{order.customer_email}</span></p>
              {order.customer_phone && <p><span className="text-gray-500">Tel:</span> <span className="font-medium">{order.customer_phone}</span></p>}
              {order.customer_document && <p><span className="text-gray-500">CPF/CNPJ:</span> <span className="font-medium">{order.customer_document}</span></p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Pagamento</h3>
            <div className="text-sm space-y-2">
              <p><span className="text-gray-500">Método:</span> <span className="font-medium capitalize">{order.payment_method}</span></p>
              <p><span className="text-gray-500">ID MP:</span> <span className="font-medium text-xs">{order.payment_id}</span></p>
              <p><span className="text-gray-500">Status:</span> <span className="font-medium">{order.payment_status}</span></p>
            </div>
          </div>

          {order.shipping_address?.address && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Endereço de Entrega</h3>
              <div className="text-sm text-gray-700">
                <p>{order.shipping_address.address}</p>
                {order.shipping_address.city && <p>{order.shipping_address.city}{order.shipping_address.state ? ` - ${order.shipping_address.state}` : ''}</p>}
                {order.shipping_address.zip && <p>{order.shipping_address.zip}</p>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Datas</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>Criado: {new Date(order.created_at).toLocaleString('pt-BR')}</p>
              <p>Atualizado: {new Date(order.updated_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {order.notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-6">
              <h3 className="font-bold text-gray-900 mb-2">Observações</h3>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}