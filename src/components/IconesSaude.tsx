// Ícones da tela de Dados. Mesma grade e mesmo peso de traço do IconesCorpo —
// 24×24, traço 1.6, tudo em `currentColor` — para as duas telas parecerem do mesmo
// app. Emoji não entra aqui: muda de forma em cada aparelho e ignora o tema.

import type { GrupoSaude } from "@/lib/kern-health";

type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Passada: duas pegadas em diagonal, o registro mais direto de deslocamento. */
function IconeMovimento({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M7.5 4.2c1.5 0 2.3 1.2 2.3 2.9 0 1.5-.5 2.6-.5 3.9 0 .9-.6 1.4-1.8 1.4s-1.8-.5-1.8-1.4c0-1.3-.5-2.4-.5-3.9 0-1.7.8-2.9 2.3-2.9Z" />
      <path d="M6 14.6c0 1 .7 1.5 1.5 1.5s1.5-.5 1.5-1.5" />
      <path d="M16.3 9.4c1.5 0 2.3 1.2 2.3 2.9 0 1.5-.5 2.6-.5 3.9 0 .9-.6 1.4-1.8 1.4s-1.8-.5-1.8-1.4c0-1.3-.5-2.4-.5-3.9 0-1.7.8-2.9 2.3-2.9Z" />
      <path d="M14.8 19.8c0 1 .7 1.5 1.5 1.5s1.5-.5 1.5-1.5" />
    </svg>
  );
}

/** Chama: energia queimada, não um raio de eletricidade. */
function IconeEnergia({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5c3.4 3 5.1 5.6 5.1 7.9 0 3.4-2.3 5.6-5.1 5.6s-5.1-2.2-5.1-5.6c0-1.2.5-2.5 1.4-3.9.4 1.3 1 2.1 1.8 2.4-.2-2.3.4-4.4 1.9-6.4Z" />
      <path d="M12 17v3.5" />
      <path d="M9.4 20.5h5.2" />
    </svg>
  );
}

/** Traçado de eletrocardiograma: o coração medido, não o coração desenhado. */
function IconeCoracao({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12.5h3.2l1.6-4.3 2.6 8.6 2.2-6 1.4 3.2h2.4" />
      <path d="M18.4 14a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
    </svg>
  );
}

/** Lua com a curva do sono descendo abaixo dela. */
function IconeSono({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M17.8 12.4a5.8 5.8 0 0 1-7.4-7.2 6.6 6.6 0 1 0 7.4 7.2Z" />
      <path d="M3.5 19.5c1.6 0 1.6-2 3.2-2s1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3.2 2 1.6-2 3.2-2" />
    </svg>
  );
}

/** Balança de plataforma vista de frente: o corpo pesado e medido. */
function IconeCorpo({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
      <path d="M12 8.4a3.6 3.6 0 0 0-3.6 3.6" />
      <path d="M12 12V8.4" />
      <path d="M7.6 16.4h8.8" />
    </svg>
  );
}

/** Copo com nível de líquido: o que entra. */
function IconeIngestao({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6.4 4.5h11.2l-1.2 14a1.8 1.8 0 0 1-1.8 1.6H9.4a1.8 1.8 0 0 1-1.8-1.6L6.4 4.5Z" />
      <path d="M7.1 11.4c1.4 0 1.4 1.2 2.8 1.2s1.4-1.2 2.8-1.2 1.4 1.2 2.8 1.2c.6 0 1-.2 1.3-.5" />
    </svg>
  );
}

export const ICONE_GRUPO: Record<GrupoSaude, (p: Props) => React.JSX.Element> = {
  movimento: IconeMovimento,
  energia: IconeEnergia,
  coracao: IconeCoracao,
  sono: IconeSono,
  corpo: IconeCorpo,
  ingestao: IconeIngestao,
};

/** Seta circular de recarga — a ação de sincronizar. */
export function IconeSincronizar({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.4 4.4v4.2h-4.2" />
    </svg>
  );
}

/** Cheveron de expandir. Gira 90° quando a linha abre. */
export function IconeSeta({ className }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  );
}
