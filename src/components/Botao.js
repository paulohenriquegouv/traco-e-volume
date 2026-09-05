'use client';

import { useState } from 'react';

/**
 * Botão padrão do app, com retorno visual de clique e de processamento.
 *
 * Três coisas que ele resolve e que faltavam:
 *  - afunda ao ser pressionado (vem do CSS global, responde no toque);
 *  - mostra rodinha e troca o texto enquanto a ação corre;
 *  - trava contra clique duplo — no checkout isso evitaria pedido repetido.
 *
 * Passe `onClick` async (ou `carregando` controlado por fora) e ele cuida do
 * resto. Se `onClick` retornar uma promise, o botão espera ela terminar.
 */

const VARIANTES = {
  primario: 'bg-primary-600 hover:bg-primary-700 text-white',
  secundario: 'bg-white border border-gray-200 hover:border-primary-300 text-gray-700',
  escuro: 'bg-gray-900 hover:bg-gray-800 text-white',
  perigo: 'bg-red-600 hover:bg-red-700 text-white',
};

const TAMANHOS = {
  pequeno: 'px-4 py-2 text-sm',
  medio: 'px-6 py-2.5 text-sm',
  grande: 'px-8 py-3 text-base',
};

export default function Botao({
  children,
  onClick,
  type = 'button',
  variante = 'primario',
  tamanho = 'medio',
  carregando: carregandoExterno,
  textoCarregando,
  disabled,
  className = '',
  relevo = true,
  ...resto
}) {
  const [carregandoInterno, setCarregandoInterno] = useState(false);
  // Quem passa `carregando` manda; senão o próprio botão observa o onClick
  const carregando = carregandoExterno ?? carregandoInterno;
  const inativo = carregando || disabled;

  const aoClicar = async (e) => {
    if (inativo) return;
    if (!onClick) return;
    const retorno = onClick(e);
    if (retorno && typeof retorno.then === 'function') {
      setCarregandoInterno(true);
      try { await retorno; } finally { setCarregandoInterno(false); }
    }
  };

  return (
    <button
      type={type}
      onClick={aoClicar}
      disabled={inativo}
      aria-busy={carregando || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-75 ${VARIANTES[variante] || VARIANTES.primario} ${TAMANHOS[tamanho] || TAMANHOS.medio} ${relevo ? `btn-3d btn-3d-${VARIANTES[variante] ? variante : 'primario'}` : ''} ${className}`}
      {...resto}
    >
      {carregando && <span className="spinner" aria-hidden="true" />}
      <span>{carregando ? (textoCarregando || 'Processando...') : children}</span>
    </button>
  );
}
