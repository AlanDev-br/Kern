"use client";

import { useMemo, useState } from "react";
import { db, type ExercicioReg, type Rotina, type Treino } from "@/lib/db";
import { grupoDoExercicio } from "@/lib/musculacao";

export function LogTreino({
  rotina,
  catalogo,
  onFechar,
}: {
  rotina?: Rotina | null;
  catalogo: string[];
  onFechar: () => void;
}) {
  const [inicio] = useState(() => new Date());
  const [titulo, setTitulo] = useState(rotina?.nome ?? "Treino");
  const [novoEx, setNovoEx] = useState("");
  const [exercicios, setExercicios] = useState<ExercicioReg[]>(() =>
    rotina
      ? rotina.exercicios.map((e) => ({
          nome: e.nome,
          sets: Array.from({ length: Math.max(1, e.series) }, () => ({ peso: 0, reps: 0, tipo: "normal" })),
        }))
      : [],
  );

  const datalistId = useMemo(() => "cat-" + Math.random().toString(36).slice(2), []);

  function addExercicio(nome: string) {
    const n = nome.trim();
    if (!n) return;
    setExercicios((xs) => [...xs, { nome: n, sets: [{ peso: 0, reps: 0, tipo: "normal" }] }]);
    setNovoEx("");
  }

  function addSet(i: number) {
    setExercicios((xs) =>
      xs.map((ex, j) => {
        if (j !== i) return ex;
        const ultimo = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { peso: ultimo?.peso ?? 0, reps: 0, tipo: "normal" }] };
      }),
    );
  }

  function setVal(i: number, s: number, campo: "peso" | "reps", v: number) {
    setExercicios((xs) =>
      xs.map((ex, j) =>
        j === i ? { ...ex, sets: ex.sets.map((st, k) => (k === s ? { ...st, [campo]: v } : st)) } : ex,
      ),
    );
  }

  function removerSet(i: number, s: number) {
    setExercicios((xs) =>
      xs.map((ex, j) => (j === i ? { ...ex, sets: ex.sets.filter((_, k) => k !== s) } : ex)),
    );
  }

  function removerExercicio(i: number) {
    setExercicios((xs) => xs.filter((_, j) => j !== i));
  }

  async function concluir() {
    const limpos = exercicios
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.reps > 0 || s.peso > 0) }))
      .filter((ex) => ex.sets.length > 0);
    if (limpos.length === 0) {
      onFechar();
      return;
    }
    const treino: Treino = {
      id: inicio.toISOString(),
      titulo: titulo.trim() || "Treino",
      inicio: inicio.toISOString(),
      fim: new Date().toISOString(),
      exercicios: limpos,
    };
    await db.treinos.put(treino);
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onFechar} className="text-sm text-muted">
          cancelar
        </button>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="flex-1 bg-transparent text-center text-base font-bold outline-none"
        />
        <button onClick={concluir} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-bg">
          Concluir
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        {exercicios.map((ex, i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{ex.nome}</p>
                <p className="text-[11px] text-muted">{grupoDoExercicio(ex.nome)}</p>
              </div>
              <button onClick={() => removerExercicio(i)} className="text-muted">✕</button>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex gap-2 px-1 text-[10px] uppercase tracking-wider text-muted">
                <span className="w-8">set</span>
                <span className="flex-1">kg</span>
                <span className="flex-1">reps</span>
                <span className="w-6" />
              </div>
              {ex.sets.map((s, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-8 text-center text-sm text-muted">{k + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={s.peso || ""}
                    onChange={(e) => setVal(i, k, "peso", parseFloat(e.target.value) || 0)}
                    className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-1.5 text-center text-sm outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.reps || ""}
                    onChange={(e) => setVal(i, k, "reps", parseInt(e.target.value, 10) || 0)}
                    className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-1.5 text-center text-sm outline-none focus:border-accent"
                  />
                  <button onClick={() => removerSet(i, k)} className="w-6 text-muted">−</button>
                </div>
              ))}
              <button onClick={() => addSet(i)} className="mt-1 w-full rounded-lg border border-line py-1.5 text-xs font-semibold text-accent">
                + série
              </button>
            </div>
          </div>
        ))}

        <div className="glass rounded-2xl p-3">
          <input
            list={datalistId}
            value={novoEx}
            onChange={(e) => setNovoEx(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addExercicio(novoEx);
            }}
            placeholder="Adicionar exercício…"
            className="w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <datalist id={datalistId}>
            {catalogo.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            onClick={() => addExercicio(novoEx)}
            className="mt-2 w-full rounded-lg bg-accent py-2 text-sm font-bold text-bg"
          >
            + exercício
          </button>
        </div>
      </div>
    </div>
  );
}
