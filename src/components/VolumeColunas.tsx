"use client";

import { LANDMARKS, type AvaliacaoGrupo, type StatusVolume } from "@/lib/musculacao";

// Cores por zona de volume (mesma semântica do coach de volume).
const COR: Record<StatusVolume, string> = {
  baixo: "#fbbf24", // amarelo (abaixo do MEV)
  ok: "var(--accent)", // verde (faixa hipertrófica)
  limite: "#fbbf24", // amarelo (perto do MRV)
  excesso: "#fb7185", // vermelho (acima do MRV)
};

const ROTULO_CURTO: Record<string, string> = {
  Quadríceps: "Quadr",
  Posteriores: "Post",
  Glúteos: "Glút",
  Panturrilha: "Pant",
};

const ALTURA = 104; // px da área de coluna

// Gráfico de colunas 3D realistas simulando tubos de vidro translúcido contendo líquido ou
// cilindros brilhantes metálicos. A elipse no topo e o brilho vertical dão profundidade visual 3D.
export function VolumeColunas({ avaliacoes }: { avaliacoes: AvaliacaoGrupo[] }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-full items-end gap-2.5 px-1 pt-4">
        {avaliacoes.map((a) => {
          const [mev, , mrv] = LANDMARKS[a.grupo];
          const pct = mrv > 0 ? Math.min(100, (a.series / mrv) * 100) : 0;
          const mevPct = mrv > 0 ? Math.min(100, (mev / mrv) * 100) : 0;
          const cor = COR[a.status];
          
          return (
            <div key={a.grupo} className="flex flex-1 basis-12 flex-col items-center gap-2">
              {/* Indicador numérico com a cor da zona */}
              <span className="text-xs font-bold tabular-nums" style={{ color: cor }}>
                {a.series}
              </span>
              
              {/* Container - Retângulo de vidro premium */}
              <div
                className="relative w-full max-w-[28px] rounded-[6px] overflow-hidden"
                style={{
                  height: ALTURA,
                  background: "rgba(255, 255, 255, 0.03)",
                  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Coluna preenchida (Retangular com gradiente vertical) */}
                {pct > 0 && (
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-[4px] transition-all duration-500 ease-out"
                    style={{
                      height: `${pct}%`,
                      background: `linear-gradient(to top, ${cor} 0%, color-mix(in srgb, ${cor} 80%, white) 100%)`,
                      boxShadow: `0 0 10px ${cor}33`,
                    }}
                  >
                    {/* Efeito de reflexo de luz vertical plano sutil */}
                    <div
                      className="absolute inset-y-0 left-0 w-[30%] bg-gradient-to-r from-white/10 to-transparent pointer-events-none"
                    />
                  </div>
                )}
                
                {/* Linha do MEV (Mínimo Efetivo) com marcação de texto sutil */}
                <div
                  className="absolute inset-x-0 z-10 border-t border-dashed border-white/30 pointer-events-none"
                  style={{ bottom: `${mevPct}%` }}
                />
              </div>
              
              {/* Rótulo do grupo muscular */}
              <span className="text-[9px] font-semibold leading-tight text-muted">
                {ROTULO_CURTO[a.grupo] ?? a.grupo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
