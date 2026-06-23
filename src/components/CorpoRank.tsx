"use client";

import type { Grupo } from "@/lib/musculacao";

// Mapa do corpo (frente e costas) com cada músculo colorido pelo rank do grupo.
// Figura estilizada: cada região é um bloco simples que, juntos, sugerem o corpo.

export interface GrupoVisual {
  cor: string;
  rotulo: string; // ex.: "Ouro 2"
}

const NEUTRO = "#3a3f4b"; // grupo sem dado

export function CorpoRank({ ranks }: { ranks: Partial<Record<Grupo, GrupoVisual>> }) {
  const cor = (g: Grupo) => ranks[g]?.cor ?? NEUTRO;
  const titulo = (g: Grupo) => `${g}${ranks[g] ? `: ${ranks[g]!.rotulo}` : ""}`;

  return (
    <div className="flex items-start justify-center gap-3">
      <Figura titulo="Frente">
        {/* cabeça / pescoço (neutros) */}
        <circle cx="50" cy="16" r="10" fill={NEUTRO} />
        <rect x="45" y="25" width="10" height="7" rx="3" fill={NEUTRO} />
        {/* ombros */}
        <ellipse cx="29" cy="44" rx="9" ry="7" fill={cor("Ombros")}><title>{titulo("Ombros")}</title></ellipse>
        <ellipse cx="71" cy="44" rx="9" ry="7" fill={cor("Ombros")}><title>{titulo("Ombros")}</title></ellipse>
        {/* peito */}
        <rect x="34" y="38" width="14" height="16" rx="4" fill={cor("Peito")}><title>{titulo("Peito")}</title></rect>
        <rect x="52" y="38" width="14" height="16" rx="4" fill={cor("Peito")}><title>{titulo("Peito")}</title></rect>
        {/* bíceps */}
        <ellipse cx="22" cy="64" rx="6" ry="13" fill={cor("Bíceps")}><title>{titulo("Bíceps")}</title></ellipse>
        <ellipse cx="78" cy="64" rx="6" ry="13" fill={cor("Bíceps")}><title>{titulo("Bíceps")}</title></ellipse>
        {/* antebraço (neutro) */}
        <ellipse cx="18" cy="88" rx="5" ry="12" fill={NEUTRO} />
        <ellipse cx="82" cy="88" rx="5" ry="12" fill={NEUTRO} />
        {/* core / abdômen */}
        <rect x="40" y="56" width="20" height="30" rx="5" fill={cor("Core")}><title>{titulo("Core")}</title></rect>
        {/* quadríceps */}
        <rect x="36" y="98" width="12" height="40" rx="5" fill={cor("Quadríceps")}><title>{titulo("Quadríceps")}</title></rect>
        <rect x="52" y="98" width="12" height="40" rx="5" fill={cor("Quadríceps")}><title>{titulo("Quadríceps")}</title></rect>
        {/* panturrilha frontal (neutro) */}
        <rect x="37" y="142" width="10" height="30" rx="4" fill={NEUTRO} />
        <rect x="53" y="142" width="10" height="30" rx="4" fill={NEUTRO} />
      </Figura>

      <Figura titulo="Costas">
        <circle cx="50" cy="16" r="10" fill={NEUTRO} />
        <rect x="45" y="25" width="10" height="7" rx="3" fill={NEUTRO} />
        {/* ombros (posterior) */}
        <ellipse cx="29" cy="44" rx="9" ry="7" fill={cor("Ombros")}><title>{titulo("Ombros")}</title></ellipse>
        <ellipse cx="71" cy="44" rx="9" ry="7" fill={cor("Ombros")}><title>{titulo("Ombros")}</title></ellipse>
        {/* costas */}
        <rect x="34" y="38" width="32" height="34" rx="6" fill={cor("Costas")}><title>{titulo("Costas")}</title></rect>
        {/* tríceps */}
        <ellipse cx="22" cy="64" rx="6" ry="13" fill={cor("Tríceps")}><title>{titulo("Tríceps")}</title></ellipse>
        <ellipse cx="78" cy="64" rx="6" ry="13" fill={cor("Tríceps")}><title>{titulo("Tríceps")}</title></ellipse>
        {/* antebraço (neutro) */}
        <ellipse cx="18" cy="88" rx="5" ry="12" fill={NEUTRO} />
        <ellipse cx="82" cy="88" rx="5" ry="12" fill={NEUTRO} />
        {/* glúteos */}
        <ellipse cx="43" cy="80" rx="8" ry="8" fill={cor("Glúteos")}><title>{titulo("Glúteos")}</title></ellipse>
        <ellipse cx="57" cy="80" rx="8" ry="8" fill={cor("Glúteos")}><title>{titulo("Glúteos")}</title></ellipse>
        {/* posteriores de coxa */}
        <rect x="36" y="98" width="12" height="40" rx="5" fill={cor("Posteriores")}><title>{titulo("Posteriores")}</title></rect>
        <rect x="52" y="98" width="12" height="40" rx="5" fill={cor("Posteriores")}><title>{titulo("Posteriores")}</title></rect>
        {/* panturrilha */}
        <rect x="37" y="142" width="10" height="30" rx="4" fill={cor("Panturrilha")}><title>{titulo("Panturrilha")}</title></rect>
        <rect x="53" y="142" width="10" height="30" rx="4" fill={cor("Panturrilha")}><title>{titulo("Panturrilha")}</title></rect>
      </Figura>
    </div>
  );
}

function Figura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <svg viewBox="0 0 100 180" className="w-full max-w-[150px]" role="img" aria-label={`Corpo - ${titulo}`}>
        {children}
      </svg>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted">{titulo}</span>
    </div>
  );
}
