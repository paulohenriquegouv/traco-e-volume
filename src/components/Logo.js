/**
 * Marca da Traço & Volume em SVG.
 *
 * O anel laranja é desenhado em duas metades: a de trás vem antes do texto e a da
 * frente depois. É isso que faz o aro atravessar o nome de verdade em vez de ficar
 * atrás dele — a órbita só existe por causa dessa ordem.
 *
 * O movimento (flutuar + inclinar) mora no globals.css, com as classes
 * `logo-flutua` e `logo-anel`, para respeitar quem pediu menos animação.
 */

const INDIGO = '#3730a3'; // primary-800
const LARANJA = '#f97316'; // accent-500

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

      {/* Sombra no chão: é o que vende a ideia de que a peça está no ar */}
      <ellipse cx="32" cy="42" rx="16" ry="2.6" fill={INDIGO} opacity="0.14" />

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '32px 21px' }}>
        {/* metade de trás */}
        <path
          d="M 4,21 A 28,14.5 0 0 1 60,21"
          fill="none"
          stroke={LARANJA}
          strokeWidth="5"
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
          stroke={LARANJA}
          strokeWidth="5"
          strokeLinecap="round"
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

      <ellipse cx="170" cy="95" rx="92" ry="5" fill={INDIGO} opacity="0.12" />

      <g className={animado ? 'logo-anel' : ''} style={{ transformOrigin: '170px 48px' }}>
        <path
          d="M 14,48 A 156,34 0 0 1 326,48"
          fill="none"
          stroke={LARANJA}
          strokeWidth="8"
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
          stroke={LARANJA}
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-7 170 48)"
        />
      </g>
    </svg>
  );
}

export default LogoMarca;
