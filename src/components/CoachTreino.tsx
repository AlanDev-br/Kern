"use client";

import { useMemo } from "react";
import type { Treino } from "@/lib/db";
import { grupoDoExercicio, type Grupo } from "@/lib/musculacao";

// Coach de treino: compara as séries reais por músculo nos últimos 7 dias com a
// meta semanal (alinhada ao plano 4x — ênfase em peito, braços e quadríceps) e
// aponta os grupos em déficit. Tunável: ajuste os alvos abaixo.
const ALVO_SEMANAL: Partial<Record<Grupo, number>> = {
  Peito: 13,
  Costas: 12,
  Ombros: 9,
  Bíceps: 12,
  Tríceps: 12,
  Quadríceps: 12,
  Posteriores: 7,
  Glúteos: 6,
  Panturrilha: 6,
  Core: 6,
};

export function CoachTreino({ treinos }: { treinos: Treino[] }) {
  const analise = useMemo(() => {
    const limite = Date.now() - 7 * 86400000;
    const feitas: Record<string, number> = {};
    let totalSets = 0;
    for (const t of treinos) {
      if (new Date(t.inicio).getTime() < limite) continue;
      for (const ex of t.exercicios) {
        const g = grupoDoExercicio(ex.nome);
        const n = ex.sets.filter((s) => s.tipo !== "warmup").length;
        feitas[g] = (feitas[g] ?? 0) + n;
        totalSets += n;
      }
    }
    const grupos = (Object.keys(ALVO_SEMANAL) as Grupo[]).map((g) => {
      const alvo = ALVO_SEMANAL[g]!;
      const atual = feitas[g] ?? 0;
      return { grupo: g, atual, alvo, falta: Math.max(0, alvo - atual), pct: Math.min(1, atual / alvo) };
    });
    const deficit = grupos.filter((x) => x.falta > 0).sort((a, b) => b.falta - a.falta);
    return { grupos, deficit, totalSets };
  }, [treinos]);

  // Sem treino nenhum na semana
  if (analise.totalSets === 0) {
    return (
      <section className="glass rounded-3xl p-5" style={{ boxShadow: "inset 0 0 0 1px var(--accent)" }}>
        <Cabecalho />
        <p className="mt-2 text-sm text-fg/90">Nenhuma série nos últimos 7 dias. Bora abrir a semana — comece pelo grupo que você mais quer desenvolver.</p>
      </section>
    );
  }

  const top = analise.deficit.slice(0, 3);

  return (
    <section
      className="glass rounded-3xl p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${top.length ? "#fb7185" : "var(--accent)"}` }}
    >
      <Cabecalho />

      {top.length === 0 ? (
        <p className="mt-2 text-sm text-fg/90">
          Volume em dia em todos os grupos esta semana. Mantém o ritmo e capricha na execução.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-fg/90">
            Abaixo da meta semanal — priorize nos próximos treinos:
          </p>
          <div className="mt-3 space-y-2.5">
            {top.map((x) => (
              <div key={x.grupo}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">{x.grupo}</span>
                  <span className="text-xs text-muted">
                    {x.atual}/{x.alvo} séries · <span className="font-bold text-rose-400">+{x.falta}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-rose-400/80" style={{ width: `${x.pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Cabecalho() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">🏋️</span>
      <span className="text-sm font-bold uppercase tracking-wider">Coach de treino</span>
      <span className="ml-auto text-[10px] uppercase tracking-widest text-muted">últimos 7 dias</span>
    </div>
  );
}
