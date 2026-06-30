"use client";

import { useMemo, useRef, useState } from "react";
import type { Treino } from "@/lib/db";
import { grupoDoExercicio, type Grupo } from "@/lib/musculacao";
import { CorpoHeatmap } from "@/components/CorpoHeatmap";
import { compartilharElemento } from "@/lib/compartilhar";

// Card de pós-treino pronto pra postar: nome, tempo, volume, séries, recordes e
// os bonecos com os músculos trabalhados. Vira PNG ao compartilhar.
export function CardPosTreino({
  treino,
  recordesAnteriores,
  onFechar,
}: {
  treino: Treino;
  recordesAnteriores: Record<string, number>; // maior carga por exercício ANTES desta sessão
  onFechar: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [enviando, setEnviando] = useState(false);

  const resumo = useMemo(() => {
    let series = 0;
    let volume = 0;
    const musculos = new Set<Grupo>();
    const recordes: { nome: string; peso: number }[] = [];
    const exercicios: { nome: string; sets: number; peso: number; reps: number; pr: boolean }[] = [];

    for (const ex of treino.exercicios) {
      musculos.add(grupoDoExercicio(ex.nome));
      let maxSessao = 0;
      let melhor = { peso: 0, reps: 0 };
      let setsValidos = 0;
      for (const s of ex.sets) {
        if (s.tipo === "warmup") continue;
        series++;
        setsValidos++;
        volume += s.peso * s.reps;
        if (s.peso > maxSessao) maxSessao = s.peso;
        if (s.peso * s.reps > melhor.peso * melhor.reps) melhor = { peso: s.peso, reps: s.reps };
      }
      const pr = maxSessao > 0 && maxSessao > (recordesAnteriores[ex.nome] ?? 0);
      if (pr) recordes.push({ nome: ex.nome, peso: maxSessao });
      exercicios.push({ nome: ex.nome, sets: setsValidos, peso: melhor.peso, reps: melhor.reps, pr });
    }

    const ms = treino.fim ? new Date(treino.fim).getTime() - new Date(treino.inicio).getTime() : 0;
    const min = Math.round(ms / 60000);
    const tempo = min >= 60 ? `${Math.floor(min / 60)}h${min % 60}` : `${min}min`;

    return { series, volume, musculos, recordes, tempo, exercicios };
  }, [treino, recordesAnteriores]);

  const data = new Date(treino.inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  async function compartilhar() {
    if (!cardRef.current) return;
    setEnviando(true);
    try {
      await compartilharElemento(cardRef.current, `treino-${treino.id.slice(0, 10)}.png`, `${treino.titulo} — Kern`);
    } catch {
      /* usuário cancelou ou indisponível */
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-sm font-bold">Treino concluído 💪</span>
        <button onClick={onFechar} className="text-sm font-medium text-muted">fechar</button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 pb-28">
        {/* ── O CARD (vira imagem) ── */}
        <div ref={cardRef} className="overflow-hidden rounded-3xl border border-line bg-card">
          {/* faixa de marca */}
          <div
            className="px-5 py-4"
            style={{ background: "linear-gradient(135deg, rgba(var(--glow),0.35), rgba(var(--glow),0.08))" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold tracking-tight">kern</span>
              <span className="text-xs text-muted">{data}</span>
            </div>
            <h2 className="mt-1 text-xl font-bold leading-tight">{treino.titulo}</h2>
          </div>

          {/* métricas */}
          <div className="grid grid-cols-4 gap-1 px-3 py-4 text-center">
            <Metrica valor={resumo.tempo} rotulo="tempo" />
            <Metrica
              valor={resumo.volume >= 1000 ? `${(resumo.volume / 1000).toFixed(1)}k` : `${resumo.volume}`}
              rotulo="volume kg"
            />
            <Metrica valor={`${resumo.series}`} rotulo="séries" />
            <Metrica valor={`${treino.exercicios.length}`} rotulo="exercícios" />
          </div>

          {/* detalhamento dos exercícios */}
          <div className="border-t border-line/30 px-5 py-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Exercícios</p>
            <div className="space-y-1.5">
              {resumo.exercicios.map((ex) => (
                <div key={ex.nome} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {ex.pr && <span className="mr-1">🏆</span>}
                    <span className="font-medium">{ex.nome}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {ex.sets}× · <span className="font-semibold text-fg">{ex.peso}kg×{ex.reps}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* bonecos dos músculos trabalhados */}
          <div className="border-t border-line/30 px-5 py-4">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted">
              Músculos trabalhados
            </p>
            <CorpoHeatmap workedMuscles={resumo.musculos} />
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {[...resumo.musculos].map((m) => (
                <span key={m} className="rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* recordes */}
          {resumo.recordes.length > 0 && (
            <div className="border-t border-line/30 px-5 py-4">
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted">
                🏆 Recordes batidos
              </p>
              <div className="space-y-1.5">
                {resumo.recordes.map((r) => (
                  <div key={r.nome} className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate font-medium">{r.nome}</span>
                    <span className="shrink-0 font-extrabold text-accent">{r.peso} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Esse card vira uma imagem pronta pra postar.
        </p>
      </div>

      {/* ações */}
      <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <button onClick={onFechar} className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-muted">
            Concluir
          </button>
          <button
            onClick={compartilhar}
            disabled={enviando}
            className="flex-[2] rounded-xl bg-accent py-3 text-sm font-bold text-bg active:scale-95 disabled:opacity-50"
          >
            {enviando ? "Gerando..." : "Compartilhar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metrica({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <p className="text-lg font-black tabular-nums leading-tight">{valor}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted">{rotulo}</p>
    </div>
  );
}
