'use client';

import Link from 'next/link';
import { useConfigLoja } from './ConfigLoja';
import { vigente, textoDaFaixa } from '@/lib/campanha';

/**
 * Faixa de anúncio da liquidação, no topo de todas as páginas.
 *
 * Aparece só enquanto a campanha está valendo — começa e termina pela data, sem
 * ninguém precisar lembrar de tirar do ar. Fora desse período não ocupa um pixel.
 *
 * A data usada aqui é a do aparelho de quem visita; o preço cobrado é decidido
 * no servidor. Um relógio adiantado no celular pode mostrar a faixa alguns
 * minutos antes ou depois — o que não pode, e não acontece, é cobrar diferente
 * do anunciado, porque as duas pontas fazem a mesma conta a partir da data.
 */
export default function FaixaCampanha() {
  const { config } = useConfigLoja();
  const campanha = config?.campanha;

  if (!vigente(campanha)) return null;

  return (
    <Link
      href="/produtos"
      className="block bg-accent-500 hover:bg-accent-600 text-white text-center text-sm font-medium py-2.5 px-4 transition-colors"
    >
      {textoDaFaixa(campanha)}
      <span className="ml-2 underline underline-offset-2">ver produtos</span>
    </Link>
  );
}
