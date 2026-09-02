'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
  { value: 'pago', label: 'Pago' },
  { value: 'em_processamento', label: 'Em Processamento' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function OrderStatusForm({ order }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [notes, setNotes] = useState(order.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/pedidos/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="font-bold text-gray-900 mb-4">Atualizar Status</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500">
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observações (opcional)"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <button type="submit" disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {loading ? 'Salvando...' : 'Atualizar Status'}
        </button>
      </form>
    </div>
  );
}