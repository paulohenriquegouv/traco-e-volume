'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigLoja } from './ConfigLoja';
import { avisosDaLoja } from '@/lib/avisos';

/**
 * A tarja de avisos, no topo de todas as páginas.
 *
 * As frases vêm de `avisosDaLoja` — frete grátis, prazo, parcelamento, novidade,
 * liquidação —, todas montadas a partir do que a loja já tem configurado. Aqui
 * mora só a vez de cada uma.
 *
 * O giro não guarda "está pausado?" em nenhum estado, e isso é de propósito. Duas
 * versões anteriores morriam justamente por isso: um `pausado` que ligava no
 * hover ou no foco e nunca mais desligava — o cursor descansando na primeira
 * linha da tela, ou o foco que fica no link depois de clicar nele e navegar —
 * deixava a tarja congelada para sempre, e só no desktop, porque em tela de toque
 * não existe cursor parado.
 *
 * Agora cada batida do relógio olha o DOM e decide na hora: se o ponteiro está
 * sobre a frase, ou se o teclado está dentro da tarja, ela espera a próxima
 * batida. Nada para de vez — no pior caso o giro perde seis segundos e volta
 * sozinho. Pausar continua servindo a quem está lendo (ou mirando o link), sem
 * poder travar o resto.
 *
 * Duas decisões que sobraram das versões anteriores e continuam valendo:
 *
 * - Quem pediu menos animação no sistema continua vendo as frases trocarem; o
 *   que sai é o movimento da troca (o `faixa-entra` do globals.css). Trocar um
 *   texto de lugar nenhum não desencadeia enjoo em ninguém, e congelar a tarja
 *   nessa preferência escondia informação de quem só pediu menos animação.
 * - Nada de `aria-live`: um leitor de tela não deve ser interrompido a cada seis
 *   segundos por uma mensagem que não é resposta a nada que a pessoa fez.
 *
 * Sem aviso nenhum configurado a tarja não ocupa um pixel. Com um só, ela mostra
 * esse um e não gira — não há para onde girar.
 */

const SEGUNDOS = 6;

export default function FaixaAvisos() {
  const { config, entrega, novidade } = useConfigLoja();
  const avisos = useMemo(
    () => avisosDaLoja(config, { gratisAcima: entrega?.gratis_acima, novidade }),
    [config, entrega, novidade]
  );

  const [vez, setVez] = useState(0);
  const tarja = useRef(null);
  const total = avisos.length;

  useEffect(() => {
    if (total < 2) return;

    const relogio = setInterval(() => {
      const caixa = tarja.current;
      // Quem está lendo a frase (ponteiro em cima) ou navegando pelo teclado
      // (foco dentro da tarja) ganha mais seis segundos — e só isso.
      const lendo = caixa
        && (caixa.querySelector('.faixa-frase')?.matches(':hover')
          || caixa.matches(':focus-within'));
      if (lendo) return;
      setVez(v => (v + 1) % total);
    }, SEGUNDOS * 1000);

    return () => clearInterval(relogio);
  }, [total]);

  if (total === 0) return null;

  // A lista pode encolher entre um giro e outro (a liquidação acabou, o produto
  // deixou de ser novidade): o resto evita apontar para um índice que sumiu.
  const aviso = avisos[vez % total];

  return (
    <div ref={tarja} className="bg-accent-500 text-white text-center text-sm font-medium px-4">
      <Link href={aviso.href} className="block py-2.5">
        {/* A `key` na frase, e não no link: é ela que troca, e é nela que a
            animação de entrada precisa recomeçar. O `inline-block` deixa o
            hover com o tamanho do texto em vez do da tela — o clique continua
            valendo na faixa toda, que é o alvo bom no celular. */}
        <span
          key={aviso.id}
          className="faixa-frase faixa-aviso inline-block hover:underline underline-offset-2"
        >
          {aviso.texto}
        </span>
      </Link>
    </div>
  );
}
