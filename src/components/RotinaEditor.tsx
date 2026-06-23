"use client";

import { useMemo, useState } from "react";
import { db, type Rotina } from "@/lib/db";
import { grupoDoExercicio } from "@/lib/musculacao";
import { ExercicioImagem } from "@/components/ExercicioImagem";

export function RotinaEditor({
  rotina,
  catalogo,
  onFechar,
}: {
  rotina: Rotina | null; // null = nova rotina
  catalogo: string[];
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(rotina?.nome ?? "Nova rotina");
  const [exercicios, setExercicios] = useState(rotina?.exercicios ?? []);
  const [novo, setNovo] = useState("");
  const datalistId = useMemo(() => "rot-cat-" + Math.random().toString(36).slice(2), []);

  function addEx(n: string) {
    const nm = n.trim();
    if (!nm) return;
    setExercicios((xs) => [...xs, { nome: nm, series: 3 }]);
    setNovo("");
  }
  function setSeries(i: number, d: number) {
    setExercicios((xs) =>
      xs.map((e, j) => (j === i ? { ...e, series: Math.max(1, e.series + d) } : e)),
    );
  }
  function removeEx(i: number) {
    setExercicios((xs) => xs.filter((_, j) => j !== i));
  }

  async function salvar() {
    const id = rotina?.id ?? `rot-custom-${Date.now()}`;
    const r: Rotina = { id, nome: nome.trim() || "Rotina", exercicios };
    await db.rotinas.put(r);
    onFechar();
  }

  async function excluir() {
    if (rotina) await db.rotinas.delete(rotina.id);
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onFechar} className="text-sm text-muted">sair</button>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1 bg-transparent text-center text-base font-bold outline-none"
        />
        <button onClick={salvar} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-bg">
          Salvar
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-28">
        {exercicios.map((ex, i) => (
          <div key={i} className="glass flex items-center gap-3 rounded-2xl p-3">
            <ExercicioImagem nome={ex.nome} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{ex.nome}</p>
              <p className="text-[11px] text-muted">{grupoDoExercicio(ex.nome)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSeries(i, -1)} className="h-8 w-8 rounded-lg border border-line text-lg">−</button>
              <span className="w-12 text-center text-sm">
                <span className="font-bold">{ex.series}</span>
                <span className="text-muted"> séries</span>
              </span>
              <button onClick={() => setSeries(i, 1)} className="h-8 w-8 rounded-lg border border-line text-lg">+</button>
            </div>
            <button onClick={() => removeEx(i)} className="px-1 text-muted">✕</button>
          </div>
        ))}

        <div className="glass rounded-2xl p-3">
          <input
            list={datalistId}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEx(novo)}
            placeholder="Adicionar exercício…"
            className="w-full rounded-lg border border-line bg-bg/50 px-3 py-2.5 text-base outline-none focus:border-accent"
          />
          <datalist id={datalistId}>
            {catalogo.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button onClick={() => addEx(novo)} className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-bg">
            + exercício
          </button>
        </div>

        {rotina && (
          <button
            onClick={excluir}
            className="w-full rounded-xl border border-[#fb7185]/40 py-2.5 text-sm font-semibold text-[#fb7185]"
          >
            Excluir rotina
          </button>
        )}
      </div>
    </div>
  );
}
