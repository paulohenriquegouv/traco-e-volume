'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useConfigLoja } from './ConfigLoja';
import { avisosDaLoja, indiceDoDia } from '@/lib/avisos';
import { hojeEmBelem } from '@/lib/campanha';

/**
 * A tarja de avisos, no topo de todas as páginas.
 *
 * As frases vêm de `avisosDaLoja` — frete grátis, prazo, parcelamento, novidade,
 * liquidação —, todas montadas a partir do que a loja já tem configurado. Aqui
 * mora só a vez de cada uma.
 *
 * Três decisões que valem explicação:
 *
 * - A troca para quando o ponteiro está SOBRE A FRASE, não em qualquer lugar da
 *   tarja. A tarja atravessa a tela inteira e fica na primeira linha da página,
 *   logo abaixo das abas do navegador: no desktop o cursor descansa ali sem
 *   ninguém querer nada, e pausar pela faixa inteira travava o giro na segunda
 *   mensagem — parecia quebrado, e no celular (que não tem cursor) não
 *   acontecia. Sobre o texto centralizado o ponteiro só chega de propósito, que
 *   é quando pausar ajuda: quem está lendo não pode ver a frase escapar no meio.
 *   O clique continua valendo na faixa toda, que é o alvo bom no celular.
 * - Quem pediu menos animação no sistema não vê nada girar: recebe um aviso só,
 *   escolhido pela data, que muda de um dia para o outro.
 * - Nada de `aria-live`: um leitor de tela não deve ser interrompido a cada seis
 *   segundos por uma mensagem que não é resposta a nada que a pessoa fez.
 *
 * Sem aviso nenhum configurado a tarja não ocupa um pixel.
 */

const SEGUNDOS = 6;

export default function FaixaAvisos() {
  const { config, entrega, novidade } = useConfigLoja();
  const avisos = useMemo(
    () => avisosDaLoja(config, { gratisAcima: entrega?.gratis_acima, novidade }),
    [config, entrega, novidade]
  );

  const [vez, setVez] = useState(0);
  const [parado, setParado] = useState(false);
  const total = avisos.length;

  useEffect(() => {
    if (total < 2) return;

    const menos = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    if (menos) {
      setVez(indiceDoDia(hojeEmBelem(), total));
      return;
    }

    if (parado) return;
    const relogio = setInterval(() => setVez(v => (v + 1) % total), SEGUNDOS * 1000);
    return () => clearInterval(relogio);
  }, [total, parado]);

  if (total === 0) return null;

  // A lista pode encolher entre um giro e outro (a liquidação acabou, o produto
  // deixou de ser novidade): o resto evita apontar para um índice que sumiu.
  const aviso = avisos[vez % total];

  return (
    <div className="bg-accent-500 text-white text-center text-sm font-medium px-4">
      <Link
        key={aviso.id}
        href={aviso.href}
        className="faixa-aviso block py-2.5"
        onFocus={() => setParado(true)}
        onBlur={() => setParado(false)}
      >
        {/* o span existe para o hover ter o tamanho da frase, e não da tela */}
        <span
          className="hover:underline underline-offset-2"
          onMouseEnter={() => setParado(true)}
          onMouseLeave={() => setParado(false)}
        >
          {aviso.texto}
        </span>
      </Link>
    </div>
  );
}
