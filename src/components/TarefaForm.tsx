"use client";

import { useState } from "react";
import type { TarefaReg } from "@/lib/db";
import type { NovaTarefa } from "@/lib/tarefas";
import type { TaskCategory } from "@/lib/types";

// Formulário de criar/editar tarefa do checklist. Usado como folha (sheet) sobre
// a Agenda. Em edição, recebe a tarefa atual; em criação, vem vazio.
export function TarefaForm({
  inicial,
  onSalvar,
  onCancelar,
}: {
  inicial?: TarefaReg;
  onSalvar: (dados: NovaTarefa) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [category, setCategory] = useState<TaskCategory>(inicial?.category ?? "bloco");
  const [xp, setXp] = useState(String(inicial?.xp ?? 10));
  const [horario, setHorario] = useState(inicial?.horario ?? "");
  const [icone, setIcone] = useState(inicial?.icone ?? "✅");

  const valido = titulo.trim().length > 0;

  function salvar() {
    if (!valido) return;
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      category,
      xp: Math.max(0, Math.round(Number(xp) || 0)),
      horario: horario || undefined,
      icone: icone.trim() || "✅",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="mb-4 text-lg font-bold">
          {inicial ? "Editar tarefa" : "Nova tarefa"}
        </h2>

        <div className="space-y-4">
          <div className="flex gap-3">
            <Campo label="Ícone" className="w-20">
              <input
                value={icone}
                onChange={(e) => setIcone(e.target.value)}
                maxLength={4}
                className="w-full rounded-xl border border-line bg-bg/40 p-3 text-center text-xl"
              />
            </Campo>
            <Campo label="Título" className="flex-1">
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Beber 3L de água"
                className="w-full rounded-xl border border-line bg-bg/40 p-3 text-sm"
              />
            </Campo>
          </div>

          <Campo label="Descrição (o porquê)">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="O motivo dela existir no plano."
              className="w-full resize-none rounded-xl border border-line bg-bg/40 p-3 text-sm"
            />
          </Campo>

          <Campo label="Tipo">
            <div className="grid grid-cols-2 gap-2">
              {(["inegociavel", "bloco"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-xl border p-3 text-sm font-semibold transition-colors ${
                    category === c
                      ? "border-accent bg-accent-soft text-fg"
                      : "border-line bg-bg/40 text-muted"
                  }`}
                >
                  {c === "inegociavel" ? "Inegociável" : "Bloco"}
                </button>
              ))}
            </div>
          </Campo>

          <div className="flex gap-3">
            <Campo label="XP" className="flex-1">
              <input
                value={xp}
                onChange={(e) => setXp(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-xl border border-line bg-bg/40 p-3 text-sm"
              />
            </Campo>
            <Campo label="Horário (opcional)" className="flex-1">
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg/40 p-3 text-sm"
              />
            </Campo>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-muted"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={!valido}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-bg disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
