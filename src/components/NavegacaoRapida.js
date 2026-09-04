'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Barra fixa de "Voltar" e "Início", presente em todas as páginas públicas.
 *
 * Fica escondida na home (não há para onde voltar) e some quando a página está
 * no topo em telas grandes, para não competir com o conteúdo — mas em celular
 * fica sempre visível, que é onde a falta de um "voltar" mais incomoda.
 */
export default function NavegacaoRapida() {
  const router = useRouter();
  const pathname = usePathname();
  const [temHistorico, setTemHistorico] = useState(false);

  useEffect(() => {
    // Se a pessoa caiu direto num link, "voltar" sairia da loja
    setTemHistorico(typeof window !== 'undefined' && window.history.length > 1);
  }, [pathname]);

  // Na home não faz sentido; o admin tem a própria navegação lateral
  if (pathname === '/' || pathname.startsWith('/admin')) return null;

  return (
    <div className="sticky top-16 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
      <div className="container-custom py-2 flex items-center gap-2">
        {temHistorico && (
          <button
            type="button"
            onClick={() => router.back()}
            className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Voltar para a página anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
        )}

        <Link
          href="/"
          className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Início
        </Link>

        <Link
          href="/produtos"
          className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          Produtos
        </Link>
      </div>
    </div>
  );
}
