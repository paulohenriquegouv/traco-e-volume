'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusPedido, { MetodoPagamento } from '@/components/StatusPedido';

const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState(null);

  useEffect(() => {
    fetch('/api/conta/pedidos')
      .then(r => r.json())
      .then(d => setPedidos(d.pedidos || []))
      .catch(() => setPedidos([]));
  }, []);

  if (pedidos === null) {
    return <p className="text-sm text-gray-400"><span className="spinner mr-2" aria-hidden="true" />Carregando seus pedidos...</p>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <h2 className="font-bold text-gray-900 mb-1">Nenhum pedido ainda</h2>
        <p className="text-sm text-gray-500 mb-2">Quando você comprar, o histórico aparece aqui.</p>
        <p className="text-sm text-gray-400 mb-5">
          Já comprou antes de criar a conta? Use{' '}
          <Link href="/pedido" className="text-primary-600">buscar pedido</Link> com o número.
        </p>
        <Link href="/produtos" className="btn-3d inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {pedidos.map(p => (
          <li key={p.order_id}>
            <Link
              href={`/minha-conta/pedidos/${p.order_id}`}
              className="btn flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm">#{p.order_id}</p>
                <p className="text-xs text-gray-400">
                  {data(p.created_at)} · <MetodoPagamento metodo={p.payment_method} />
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{dinheiro(p.total)}</p>
                  <StatusPedido status={p.status} />
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
