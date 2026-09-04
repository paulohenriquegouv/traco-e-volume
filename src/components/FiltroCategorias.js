'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Lista de categorias.
 *
 * No celular ocupava meia tela antes de mostrar um produto sequer, então vira um
 * menu que abre e fecha — e começa fechado, mostrando só qual filtro está ativo.
 * No desktop sobra espaço na coluna lateral: lá continua sempre aberta.
 */
export default function FiltroCategorias({ categorias, categoriaAtual }) {
  const [aberto, setAberto] = useState(false);

  const nomeBonito = (c) => c.charAt(0).toUpperCase() + c.slice(1);
  const selecionada = categoriaAtual ? nomeBonito(categoriaAtual) : 'Todas';
  const totalItens = categorias.reduce((s, c) => s + Number(c.count || 0), 0);

  const itens = (
    <ul className="space-y-2">
      <li>
        <Link
          href="/produtos"
          className={`block py-1 text-sm ${!categoriaAtual ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Todas ({totalItens})
        </Link>
      </li>
      {categorias.map(c => (
        <li key={c.category}>
          <Link
            href={`/produtos?categoria=${encodeURIComponent(c.category)}`}
            className={`block py-1 text-sm ${categoriaAtual === c.category ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {nomeBonito(c.category)} ({c.count})
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6">
      {/* Celular: cabeçalho clicável que abre e fecha */}
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        aria-controls="lista-categorias"
        className="md:hidden w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="font-semibold text-gray-900">
          Categorias
          <span className="ml-2 font-normal text-sm text-gray-500">{selecionada}</span>
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div id="lista-categorias" className={`${aberto ? 'block mt-4' : 'hidden'} md:block`}>
        <h3 className="hidden md:block font-semibold text-gray-900 mb-4">Categorias</h3>
        {itens}
      </div>
    </div>
  );
}
