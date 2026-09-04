'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusPedido from '@/components/StatusPedido';

const dinheiro = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (d) => new Date(d).toLocaleDateString('pt-BR');

export default function PainelMinhaConta() {
  const [pedidos, setPedidos] = useState(null);
  const [enderecos, setEnderecos] = useState(null);

  useEffect(() => {
    fetch('/api/conta/pedidos').then(r => r.json()).then(d => setPedidos(d.pedidos || [])).catch(() => setPedidos([]));
    fetch('/api/conta/enderecos').then(r => r.json()).then(d => setEnderecos(d.enderecos || [])).catch(() => setEnderecos([]));
  }, []);

  const carregando = pedidos === null || enderecos === null;
  const gastoTotal = (pedidos || [])
    .filter(p => ['pago', 'em_processamento', 'enviado', 'entregue'].includes(p.status))
    .reduce((s, p) => s + Number(p.total), 0);

  return (
    <div className="space-y-6">
      {/* Resumo: só faz sentido quando já existe compra */}
      {!carregando && pedidos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Pedidos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pedidos.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs uppercase tracking-wider text-gray-400">Total comprado</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{dinheiro(gastoTotal)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Pedidos recentes</h2>
          {!carregando && pedidos.length > 3 && (
            <Link href="/minha-conta/pedidos" className="btn text-sm text-primary-600 font-medium">Ver todos</Link>
          )}
        </div>

        {carregando ? (
          <p className="text-sm text-gray-400 py-4"><span className="spinner mr-2" aria-hidden="true" />Carregando...</p>
        ) : pedidos.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-gray-500 mb-1">Você ainda não tem pedidos por aqui.</p>
            <p className="text-sm text-gray-400 mb-4">
              Comprou antes de criar a conta? Consulte pelo número em{' '}
              <Link href="/pedido" className="text-primary-600">buscar pedido</Link>.
            </p>
            <Link href="/produtos" className="btn-3d inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
              Ver produtos
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pedidos.slice(0, 3).map(p => (
              <li key={p.order_id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/minha-conta/pedidos/${p.order_id}`} className="btn font-medium text-gray-900 hover:text-primary-600 text-sm">
                    #{p.order_id}
                  </Link>
                  <p className="text-xs text-gray-400">{data(p.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium text-gray-900 text-sm">{dinheiro(p.total)}</p>
                  <StatusPedido status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900">Endereço de entrega</h2>
          <Link href="/minha-conta/enderecos" className="btn text-sm text-primary-600 font-medium">Gerenciar</Link>
        </div>
        {carregando ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : enderecos.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum endereço salvo. Cadastrar um agora deixa o checkout mais rápido depois.
          </p>
        ) : (
          (() => {
            const e = enderecos.find(x => x.padrao) || enderecos[0];
            return (
              <p className="text-sm text-gray-600">
                {e.address}{e.number ? `, ${e.number}` : ''}{e.complement ? ` — ${e.complement}` : ''}<br />
                {e.neighborhood ? `${e.neighborhood}, ` : ''}{e.city}/{e.state} · CEP {e.zip}
              </p>
            );
          })()
        )}
      </div>
    </div>
  );
}
