/**
 * Marca da Traço & Volume em SVG.
 *
 * O anel laranja é desenhado em duas metades: a de trás vem antes do texto e a da
 * frente depois. É isso que faz o aro atravessar o nome de verdade em vez de ficar
 * atrás dele — a órbita só existe por causa dessa ordem.
 *
 * O aro tem volume, e ele vem de três coisas somadas, não de sombra por cima:
 *
 *  1. Espessura. A metade da frente é mais grossa que a de trás, porque o que está
 *     perto ocupa mais espaço na vista. É a pista de profundidade mais barata e a
 *     que funciona até em 24 pixels, quando nenhum degradê ainda é visível.
 *  2. Degradê no traço. A luz vem de cima: cada metade clareia no topo e escurece
 *     embaixo, e a metade de trás inteira é mais escura que a da frente.
 *  3. Um brilho fino correndo pela borda de cima da metade da frente — o reflexo
 *     que um tubo redondo faria. É um arco num raio um pouco menor, cortado nas
 *     pontas pelo `strokeDasharray` para não sobrar risco solto nas laterais.
 *
 * Os degradês vivem em `<defs>` com id fixo. Se a mesma marca aparecer duas vezes
 * na página, os ids repetem e o navegador resolve `url(#id)` pelo primeiro — que
 * é idêntico ao segundo, então o desenho sai igual de qualquer jeito.
 *
 * O movimento (flutuar + inclinar) mora no globals.css, com as classes
 * `logo-flutua` e `logo-anel`, para respeitar quem pediu menos animação.
 */

const INDIGO = '#3730a3'; // primary-800
const LARANJA = '#f97316'; // accent-500 — a cor da marca, no meio do tubo
const LARANJA_LUZ = '#fdba74'; // accent-300 — a borda de cima, virada para a luz
const LARANJA_SOMBRA = '#ea580c'; // accent-600 — a borda de baixo da metade da frente
const LARANJA_FUNDO = '#c2410c'; // accent-700 — o lado de lá, mais longe e mais escuro
const BRILHO = '#ffedd5'; // accent-100 — o reflexo

/** Ícone quadrado: anel em volta do monograma. Use no cabeçalho e no favicon. */
export function LogoMarca({ className = '', animado = true, titulo = 'Traço & Volume' }) {
  const mov = animado ? 'logo-flutua' : '';
  return (
    /* A moldura é justa ao desenho (64x46, não um quadrado): o anel é achatado e
       um viewBox quadrado deixaria faixas vazias em cima e embaixo, fazendo a
       marca parecer menor do que é ao lado do nome. */
    <svg
      viewBox="0 0 64 46"
      className={`${className} ${mov}`}
      role="img"
      aria-label={titulo}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titulo}</title>

      <defs>
        <linearGradient id="tv-marca-frente" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LARANJA_LUZ} />
          <stop offset="0.5" stopColor={LARANJA} />
          <stop offset="1" stopColor={LARANJA_SOMBRA} />
        </linearGradient>
        <linearGradient id="tv-marca-tras" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LARANJA} />
          <stop offset="1" stopColor={LARANJA_FUNDO} />
        </linearGradient>
      </defs>

      {/* Sombra no chão: é o que vende a ideia de que a peça está no ar */}
      <ellipse cx="32" cy="42" rx="16" ry="2.6" fill={INDIGO} opacity="0.14" />

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '32px 21px' }}>
        {/* metade de trás: mais fina e mais escura, porque está longe */}
        <path
          d="M 4,21 A 28,14.5 0 0 1 60,21"
          fill="none"
          stroke="url(#tv-marca-tras)"
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-17 32 21)"
        />
      </g>

      <text
        x="32"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="22"
        fontWeight="800"
        letterSpacing="-0.5"
        fill={INDIGO}
      >
        T&amp;V
      </text>

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '32px 21px' }}>
        {/* metade da frente */}
        <path
          d="M 60,21 A 28,14.5 0 0 1 4,21"
          fill="none"
          stroke="url(#tv-marca-frente)"
          strokeWidth="4.6"
          strokeLinecap="round"
          transform="rotate(-17 32 21)"
        />
        {/* o reflexo, num raio menor para cair na borda de cima do tubo.
            pathLength=100 deixa o corte em porcentagem, sem depender do
            comprimento real do arco. */}
        <path
          d="M 59.2,21 A 27.2,13.7 0 0 1 4.8,21"
          fill="none"
          stroke={BRILHO}
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.55"
          pathLength="100"
          strokeDasharray="62 100"
          strokeDashoffset="-19"
          transform="rotate(-17 32 21)"
        />
      </g>
    </svg>
  );
}

/** Assinatura horizontal completa: anel em volta do nome por extenso. */
export function LogoCompleta({ className = '', animado = true, titulo = 'Traço & Volume' }) {
  const mov = animado ? 'logo-flutua' : '';
  return (
    <svg
      viewBox="0 0 340 104"
      className={`${className} ${mov}`}
      role="img"
      aria-label={titulo}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{titulo}</title>

      <defs>
        <linearGradient id="tv-completa-frente" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LARANJA_LUZ} />
          <stop offset="0.5" stopColor={LARANJA} />
          <stop offset="1" stopColor={LARANJA_SOMBRA} />
        </linearGradient>
        <linearGradient id="tv-completa-tras" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LARANJA} />
          <stop offset="1" stopColor={LARANJA_FUNDO} />
        </linearGradient>
      </defs>

      <ellipse cx="170" cy="95" rx="92" ry="5" fill={INDIGO} opacity="0.12" />

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '170px 48px' }}>
        <path
          d="M 14,48 A 156,34 0 0 1 326,48"
          fill="none"
          stroke="url(#tv-completa-tras)"
          strokeWidth="4.8"
          strokeLinecap="round"
          transform="rotate(-7 170 48)"
        />
      </g>

      <text
        x="170"
        y="48"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="29"
        fontWeight="800"
        letterSpacing="-0.8"
        fill={INDIGO}
      >
        Traço &amp; Volume
      </text>

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '170px 48px' }}>
        <path
          d="M 326,48 A 156,34 0 0 1 14,48"
          fill="none"
          stroke="url(#tv-completa-frente)"
          strokeWidth="7.4"
          strokeLinecap="round"
          transform="rotate(-7 170 48)"
        />
        <path
          d="M 321.5,48 A 151.5,32.1 0 0 1 18.5,48"
          fill="none"
          stroke={BRILHO}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
          pathLength="100"
          strokeDasharray="62 100"
          strokeDashoffset="-19"
          transform="rotate(-7 170 48)"
        />
      </g>
    </svg>
  );
}

export default LogoMarca;
