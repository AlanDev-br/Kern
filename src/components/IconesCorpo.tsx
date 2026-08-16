// Ícones da composição corporal. Desenhados como SVG de traço, não emoji: emoji
// muda de forma em cada aparelho, não aceita a cor do tema e destoa do resto da
// interface. Aqui todos herdam `currentColor` e têm o mesmo peso de traço.
//
// Grade de 24×24, traço 1.6. Cada símbolo tenta ser a coisa em si — célula de
// gordura, braço flexionado, gota — e não uma letra dentro de um círculo.

type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Adipócitos: as células de gordura se agrupam em cacho, com o núcleo deslocado. */
export function IconeGordura({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="8.5" cy="9" r="4.2" />
      <circle cx="15.8" cy="11.5" r="3.6" />
      <circle cx="10.5" cy="17" r="3.4" />
      <circle cx="7.2" cy="7.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.4" cy="16" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Braço flexionado — o bíceps é o símbolo universal de massa muscular. */
export function IconeMusculo({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 18.5v-3.2c0-2.4 1.5-4.1 3.8-4.6l3-.7" />
      <path d="M10.8 10c1.1-2.3 3-3.6 5.2-3.6 2.6 0 4 1.7 4 3.9 0 2.4-1.7 4-4.2 4.4" />
      <path d="M15.8 14.7c1.4 1 2.1 2.3 2.1 3.8" />
      <path d="M4 18.5h13.9" />
      <path d="M8.6 11.4c.6 1.6 2 2.6 3.9 2.8" />
    </svg>
  );
}

/** Gota — água corporal. */
export function IconeAgua({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.2c3.4 4 5.6 6.8 5.6 9.6a5.6 5.6 0 1 1-11.2 0c0-2.8 2.2-5.6 5.6-9.6z" />
      <path d="M9.2 13.6c0 1.7 1.2 3 2.8 3.3" />
    </svg>
  );
}

/** Osso longo com as epífises nas pontas. */
export function IconeOsso({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8.6 15.4 15.4 8.6" />
      <path d="M8.6 15.4a2.1 2.1 0 1 0-2.9 2.9 2.1 2.1 0 1 0 2.9 2.2 2.1 2.1 0 0 0 2.2-2.9" />
      <path d="M15.4 8.6a2.1 2.1 0 1 1 2.9-2.9 2.1 2.1 0 1 1 2.2 2.9 2.1 2.1 0 0 1-2.9 2.2" />
    </svg>
  );
}

/** Tronco visto de cima, com a gordura acumulada em volta dos órgãos. */
export function IconeVisceral({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="12" cy="12" rx="8.6" ry="7" />
      <ellipse cx="12" cy="12" rx="4.4" ry="3.6" strokeDasharray="2 1.6" />
      <path d="M12 5v1.4M12 17.6V19M3.4 12h1.4M19.2 12h1.4" />
    </svg>
  );
}

/** Cadeia de aminoácidos — proteína. */
export function IconeProteina({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="5.4" cy="8.4" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.6" cy="8.4" r="2.2" />
      <circle cx="12" cy="19" r="2.2" />
      <path d="M7.3 9.6 10.1 11M13.9 11l2.8-1.4M12 14.2v2.6" />
    </svg>
  );
}

/** Chama — gasto energético em repouso. */
export function IconeBasal({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.4c.6 2.5 2 3.6 3.4 5.1 1.5 1.6 2.4 3.2 2.4 5.2a5.8 5.8 0 1 1-11.6 0c0-1.5.5-2.7 1.4-3.9.4 1 1 1.6 1.9 1.9.2-3 1.3-5.5 2.5-8.3z" />
      <path d="M12 19.6a2.9 2.9 0 0 0 2.9-2.9c0-1.3-.9-2.2-1.7-3-.5 1-1.1 1.4-1.9 1.7-.6.5-1 1-1 2a2.7 2.7 0 0 0 1.7 2.2z" />
    </svg>
  );
}

/** Ampulheta — idade metabólica. */
export function IconeIdade({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.6 3.4h10.8M6.6 20.6h10.8" />
      <path d="M8 3.4v3.1c0 2 1.6 3.4 4 5.5 2.4-2.1 4-3.5 4-5.5V3.4" />
      <path d="M8 20.6v-3.1c0-2 1.6-3.4 4-5.5 2.4 2.1 4 3.5 4 5.5v3.1" />
    </svg>
  );
}

/** Balança de piso, vista de cima. */
export function IconePeso({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.2" y="4.4" width="17.6" height="15.2" rx="3" />
      <path d="M12 8.2a4 4 0 0 0-3.4 6.1" />
      <path d="M12 8.2a4 4 0 0 1 3.4 6.1" />
      <path d="M12 12.2 14.2 9.6" />
    </svg>
  );
}

/** Fita métrica em volta da cintura. */
export function IconeCintura({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M8.4 3.4c-.9 2.4-1.3 4.3-1.3 5.9 0 1.5.5 2.6 1.3 3.4M15.6 3.4c.9 2.4 1.3 4.3 1.3 5.9 0 1.5-.5 2.6-1.3 3.4" />
      <rect x="4.6" y="12.4" width="14.8" height="4.6" rx="2.3" />
      <path d="M8.2 14v1.4M11.1 14v1.4M14 14v1.4M16.9 14v1.4" />
      <path d="M8.7 17c-.5 1.6-.8 2.8-.9 3.6M15.3 17c.5 1.6.8 2.8.9 3.6" />
    </svg>
  );
}

/** Massa magra: silhueta do corpo sem a camada de gordura. */
export function IconeMassaMagra({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="4.8" r="2.4" />
      <path d="M12 7.6c-2.4 0-4 1.3-4.4 3.4l-.7 3.4h2.2l.5 5.8h4.8l.5-5.8h2.2l-.7-3.4C16 8.9 14.4 7.6 12 7.6z" />
    </svg>
  );
}
