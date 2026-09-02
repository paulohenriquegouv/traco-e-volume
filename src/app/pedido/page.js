'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PedidoPage() {
  const [searchType, setSearchType] = useState('order_id');
  const [searchValue, setSearchValue] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const body = searchType === 'order_id' ? { order_id: searchValue } : { email: searchValue };
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pedido não encontrado');
      setOrder(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const statusColors = {
    aguardando_pagamento: 'bg-yellow-100 text-yellow-700',
    pago: 'bg-green-100 text-green-700',
    em_processamento: 'bg-blue-100 text-blue-700',
    enviado: 'bg-primary-100 text-primary-700',
    entregue: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  };

  const statusLabels = {
    aguardando_pagamento: 'Aguardando Pagamento',
    pago: 'Pago',
    em_processamento: 'Em Processamento',
    enviado: 'Enviado',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  return (
    <div className="container-custom py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Meu Pedido</h1>

      <div className="max-w-md mx-auto">
        <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setSearchType('order_id')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${searchType === 'order_id' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Nº do Pedido
            </button>
            <button type="button" onClick={() => setSearchType('email')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${searchType === 'email' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              E-mail
            </button>
          </div>

          <input type={searchType === 'email' ? 'email' : 'text'}
            placeholder={searchType === 'email' ? 'Seu e-mail' : 'Ex: TV2026090100001'}
            value={searchValue} onChange={e => setSearchValue(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500" />

          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Buscando...' : 'Buscar Pedido'}
          </button>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>

      {order && (
        <div className="max-w-xl mx-auto mt-8 bg-white rounded-xl border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Pedido #{order.order_id}</h3>
              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <div className="space-y-2">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product_name} x{item.quantity}</span>
                <span className="font-medium text-gray-900">{Number(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            ))}
            <hr className="border-gray-100" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{Number(order.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p><strong>Nome:</strong> {order.customer_name}</p>
            <p><strong>E-mail:</strong> {order.customer_email}</p>
          </div>
        </div>
      )}
    </div>
  );
}