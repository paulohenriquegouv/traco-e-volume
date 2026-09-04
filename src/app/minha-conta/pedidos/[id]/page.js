'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import StatusPedido, { MetodoPagamento } from '@/components/StatusPedido';

const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function DetalheDoPedido() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch(`/api/conta/pedidos?id=${encodeURIComponent(id)}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.erro || 'Pedido não encontrado');
        setPedido(d.pedido);
      })
      .catch(e => setErro(e.message));
  }, [id]);

  if (erro) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <p className="text-gray-900 font-medium mb-1">{erro}</p>
        <p className="text-sm text-gray-500 mb-5">Confira o número ou volte para a lista.</p>
        <Link href="/minha-conta/pedidos" className="btn text-primary-600 font-medium text-sm">Meus pedidos</Link>
      </div>
    );
  }

  if (!pedido) {
    return <p className="text-sm text-gray-400"><span className="spinner mr-2" aria-hidden="true" />Carregando pedido...</p>;
  }

  const end = pedido.shipping_address || {};
  const temEndereco = end.address || end.city;

  return (
    <div className="space-y-4">
      <Link href="/minha-conta/pedidos" className="btn inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Meus pedidos
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold text-gray-900">Pedido #{pedido.order_id}</h2>
          <StatusPedido status={pedido.status} />
        </div>
        <p className="text-sm text-gray-500">
          Feito em {dataHora(pedido.created_at)} · <MetodoPagamento metodo={pedido.payment_method} />
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Itens</h3>
        <ul className="divide-y divide-gray-100">
          {(pedido.itens || []).map(item => (
            <li key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} × {dinheiro(item.unit_price)}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900 shrink-0">{dinheiro(item.total)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-lg text-gray-900">{dinheiro(pedido.total)}</span>
        </div>
      </div>

      {temEndereco && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-2">Entrega</h3>
          <p className="text-sm text-gray-600">
            {end.address}{end.number ? `, ${end.number}` : ''}{end.complement ? ` — ${end.complement}` : ''}<br />
            {end.neighborhood ? `${end.neighborhood}, ` : ''}{end.city}{end.state ? `/${end.state}` : ''}
            {end.zip ? ` · CEP ${end.zip}` : ''}
          </p>
        </div>
      )}

      {pedido.status === 'aguardando_pagamento' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Este pedido ainda aguarda o pagamento. Assim que ele for confirmado, o status muda
          aqui automaticamente.
        </div>
      )}
    </div>
  );
}
