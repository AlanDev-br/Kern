"use client";

import { useMemo, useState } from "react";
import { grupoDoExercicio } from "@/lib/musculacao";

// Seletor de exercício em folha cheia: busca no TOPO + lista rolável abaixo.
// Substitui o <datalist> nativo (que cobria o teclado). Serve para adicionar e
// para substituir um exercício no treino aberto.
export function SeletorExercicio({
  catalogo,
  titulo,
  onEscolher,
  onFechar,
}: {
  catalogo: string[];
  titulo: string;
  onEscolher: (nome: string) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = q ? catalogo.filter((c) => c.toLowerCase().includes(q)) : catalogo;
    return base.slice(0, 200);
  }, [busca, catalogo]);

  const q = busca.trim();
  const exato = catalogo.some((c) => c.toLowerCase() === q.toLowerCase());

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line px-3 pb-2 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <button
          onClick={onFechar}
          aria-label="Voltar"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card"
        >
          ←
        </button>
        <span className="text-sm font-bold">{titulo}</span>
        <div className="w-10" />
      </header>

      {/* Busca fixa no topo */}
      <div className="border-b border-line p-3">
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar exercício…"
          className="w-full rounded-xl border border-line bg-bg/40 px-3 py-3 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 pb-28">
        {q && !exato && (
          <button
            onClick={() => onEscolher(q)}
            className="mb-2 w-full rounded-xl border border-dashed border-accent/60 px-3 py-3 text-left text-sm font-semibold text-accent active:scale-[0.99]"
          >
            + Adicionar &quot;{q}&quot; (personalizado)
          </button>
        )}
        <div className="space-y-1">
          {filtrados.map((c) => (
            <button
              key={c}
              onClick={() => onEscolher(c)}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-3 py-3 text-left active:scale-[0.99]"
            >
              <span className="min-w-0 truncate text-sm font-medium">{c}</span>
              <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wider text-muted">
                {grupoDoExercicio(c)}
              </span>
            </button>
          ))}
          {filtrados.length === 0 && !q && (
            <p className="py-6 text-center text-sm text-muted">Sem exercícios no catálogo ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
