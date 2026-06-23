"use client";

import { useEffect, useMemo, useState } from "react";
import { db, type Rotina, type Treino } from "@/lib/db";
import { grupoDoExercicio } from "@/lib/musculacao";
import { ExercicioImagem } from "@/components/ExercicioImagem";

interface SetLocal {
  peso: number;
  reps: number;
  tipo?: string;
  feito?: boolean;
}
interface ExLocal {
  nome: string;
  sets: SetLocal[];
}

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(seg)}` : `${p(m)}:${p(seg)}`;
}

export function LogTreino({
  rotina,
  catalogo,
  recordes,
  anteriores,
  onFechar,
}: {
  rotina?: Rotina | null;
  catalogo: string[];
  recordes: Record<string, number>; // exercício -> maior carga já feita
  anteriores: Record<string, { peso: number; reps: number }[]>; // última sessão por exercício
  onFechar: () => void;
}) {
  const [inicio] = useState(() => new Date());
  const [agora, setAgora] = useState(() => Date.now());
  const [titulo, setTitulo] = useState(rotina?.nome ?? "Treino");
  const [novoEx, setNovoEx] = useState("");
  const [exercicios, setExercicios] = useState<ExLocal[]>(() =>
    rotina
      ? rotina.exercicios.map((e) => ({
          nome: e.nome,
          sets: Array.from({ length: Math.max(1, e.series) }, () => ({ peso: 0, reps: 0, tipo: "normal" })),
        }))
      : [],
  );

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const datalistId = useMemo(() => "cat-" + Math.random().toString(36).slice(2), []);

  // volume da sessão (séries feitas + tonelagem)
  const { seriesFeitas, tonelagem } = useMemo(() => {
    let sf = 0, ton = 0;
    for (const ex of exercicios)
      for (const s of ex.sets)
        if (s.feito && s.reps > 0) {
          sf++;
          ton += s.peso * s.reps;
        }
    return { seriesFeitas: sf, tonelagem: ton };
  }, [exercicios]);

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
        const u = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { peso: u?.peso ?? 0, reps: u?.reps ?? 0, tipo: "normal" }] };
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
  function toggleFeito(i: number, s: number) {
    setExercicios((xs) =>
      xs.map((ex, j) =>
        j === i ? { ...ex, sets: ex.sets.map((st, k) => (k === s ? { ...st, feito: !st.feito } : st)) } : ex,
      ),
    );
  }
  function removerSet(i: number, s: number) {
    setExercicios((xs) => xs.map((ex, j) => (j === i ? { ...ex, sets: ex.sets.filter((_, k) => k !== s) } : ex)));
  }
  function removerExercicio(i: number) {
    setExercicios((xs) => xs.filter((_, j) => j !== i));
  }

  async function concluir() {
    const limpos = exercicios
      .map((ex) => ({
        nome: ex.nome,
        sets: ex.sets.filter((s) => s.reps > 0 || s.peso > 0).map((s) => ({ peso: s.peso, reps: s.reps, tipo: s.tipo })),
      }))
      .filter((ex) => ex.sets.length > 0);
    if (limpos.length === 0) return onFechar();
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
      <div className="border-b border-line p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button onClick={onFechar} className="text-sm text-muted">sair</button>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="flex-1 bg-transparent text-center text-base font-bold outline-none"
          />
          <button onClick={concluir} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-bg">
            Concluir
          </button>
        </div>
        <div className="mt-2 flex justify-center gap-4 text-xs text-muted">
          <span>⏱ {mmss(agora - inicio.getTime())}</span>
          <span>{seriesFeitas} séries</span>
          <span>{tonelagem.toLocaleString("pt-BR")} kg</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        {exercicios.map((ex, i) => {
          const recorde = recordes[ex.nome] ?? 0;
          const prevSets = anteriores[ex.nome];
          return (
            <div key={i} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <ExercicioImagem nome={ex.nome} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight">{ex.nome}</p>
                  <p className="text-xs text-muted">
                    {grupoDoExercicio(ex.nome)}
                    {recorde > 0 && ` · recorde ${recorde}kg`}
                  </p>
                </div>
                <button onClick={() => removerExercicio(i)} className="px-1 text-lg text-muted">✕</button>
              </div>

              {prevSets && prevSets.length > 0 && (
                <p className="mt-2 text-[11px] text-muted">
                  Última vez: {prevSets.map((s) => `${s.peso}×${s.reps}`).join(" · ")}
                </p>
              )}

              <div className="mt-3 space-y-1.5">
                <div className="flex gap-2 px-1 text-[10px] uppercase tracking-wider text-muted">
                  <span className="w-7">set</span>
                  <span className="flex-1">kg</span>
                  <span className="flex-1">reps</span>
                  <span className="w-8 text-center">ok</span>
                </div>
                {ex.sets.map((s, k) => {
                  const pr = s.feito && s.reps > 0 && s.peso > recorde && s.peso > 0;
                  const prev = prevSets?.[k];
                  return (
                    <div key={k} className={`flex items-center gap-2 rounded-lg ${s.feito ? "bg-accent-soft" : ""}`}>
                      <span className="w-7 text-center text-sm text-muted">{k + 1}</span>
                      <input
                        type="number" inputMode="decimal" value={s.peso || ""}
                        placeholder={prev ? String(prev.peso) : "kg"}
                        onChange={(e) => setVal(i, k, "peso", parseFloat(e.target.value) || 0)}
                        className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-3 text-center text-base outline-none placeholder:text-muted/50 focus:border-accent"
                      />
                      <input
                        type="number" inputMode="numeric" value={s.reps || ""}
                        placeholder={prev ? String(prev.reps) : "reps"}
                        onChange={(e) => setVal(i, k, "reps", parseInt(e.target.value, 10) || 0)}
                        className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-3 text-center text-base outline-none placeholder:text-muted/50 focus:border-accent"
                      />
                      <button
                        onClick={() => toggleFeito(i, k)}
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg ${
                          s.feito ? "border-accent bg-accent text-bg" : "border-line text-transparent"
                        }`}
                      >
                        ✓
                      </button>
                      <span className="w-4 text-xs">{pr ? "🏆" : ""}</span>
                      <button onClick={() => removerSet(i, k)} className="w-5 text-muted">−</button>
                    </div>
                  );
                })}
                <button onClick={() => addSet(i)} className="mt-1 w-full rounded-lg border border-line py-1.5 text-xs font-semibold text-accent">
                  + série
                </button>
              </div>
            </div>
          );
        })}

        <div className="glass rounded-2xl p-3">
          <input
            list={datalistId}
            value={novoEx}
            onChange={(e) => setNovoEx(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExercicio(novoEx)}
            placeholder="Adicionar exercício…"
            className="w-full rounded-lg border border-line bg-bg/50 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <datalist id={datalistId}>
            {catalogo.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button onClick={() => addExercicio(novoEx)} className="mt-2 w-full rounded-lg bg-accent py-2 text-sm font-bold text-bg">
            + exercício
          </button>
        </div>
      </div>
    </div>
  );
}
