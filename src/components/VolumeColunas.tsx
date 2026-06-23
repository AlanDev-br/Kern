"use client";

import { LANDMARKS, type AvaliacaoGrupo, type StatusVolume } from "@/lib/musculacao";

// Cores por zona de volume (mesma semântica do coach de volume).
const COR: Record<StatusVolume, string> = {
  baixo: "#fbbf24", // abaixo do mínimo pra crescer
  ok: "var(--accent)", // faixa de hipertrofia
  limite: "#fbbf24", // perto do teto
  excesso: "#fb7185", // acima do recuperável
};

const ROTULO_CURTO: Record<string, string> = {
  Quadríceps: "Quadr",
  Posteriores: "Post",
  Glúteos: "Glút",
  Panturrilha: "Pant",
};

const ALTURA = 104; // px da área de coluna

// Gráfico de colunas do volume semanal por grupo. A altura de cada coluna é
// proporcional ao MRV do grupo (teto recuperável); a cor muda conforme a zona
// (abaixo do mínimo, faixa de hipertrofia, perto do teto, excesso). A linha
// tracejada marca o MEV — mínimo de séries para o músculo crescer.
export function VolumeColunas({ avaliacoes }: { avaliacoes: AvaliacaoGrupo[] }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-full items-end gap-2 px-1">
        {avaliacoes.map((a) => {
          const [mev, , mrv] = LANDMARKS[a.grupo];
          const pct = mrv > 0 ? Math.min(100, (a.series / mrv) * 100) : 0;
          const mevPct = mrv > 0 ? Math.min(100, (mev / mrv) * 100) : 0;
          const cor = COR[a.status];
          return (
            <div key={a.grupo} className="flex flex-1 basis-12 flex-col items-center gap-1.5">
              <span className="text-xs font-bold tabular-nums" style={{ color: cor }}>
                {a.series}
              </span>
              <div
                className="relative w-full max-w-[34px] rounded-md"
                style={{
                  height: ALTURA,
                  background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(255,255,255,0.04))",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                {/* coluna 3D: corpo + brilho + topo cilíndrico */}
                {pct > 0 && (
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-[5px] transition-all"
                    style={{
                      height: `${pct}%`,
                      background: cor,
                      boxShadow: `0 3px 10px -2px ${cor}99`,
                    }}
                  >
                    <div
                      className="absolute inset-0 rounded-t-[5px]"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 38%, rgba(0,0,0,0.3))",
                      }}
                    />
                    {/* topo arredondado (cara de cilindro) */}
                    <div
                      className="absolute -top-1 inset-x-0 h-2 rounded-[50%]"
                      style={{ background: cor, filter: "brightness(1.3)" }}
                    />
                  </div>
                )}
                {/* linha do MEV (mínimo pra crescer) */}
                <div
                  className="absolute inset-x-0 z-10 border-t border-dashed border-fg/60"
                  style={{ bottom: `${mevPct}%` }}
                />
              </div>
              <span className="text-[9px] leading-tight text-muted">
                {ROTULO_CURTO[a.grupo] ?? a.grupo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
