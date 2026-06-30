"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { TaskItem } from "@/components/TaskItem";
import { TarefaForm } from "@/components/TarefaForm";
import type { TarefaReg } from "@/lib/db";
import type { NovaTarefa } from "@/lib/tarefas";

// Template do dia e da semana — referência (vindo da antiga Rotina). Fica numa
// seção recolhível abaixo do checklist editável.
const TEMPLATE_DIA = [
  { h: "06:30", t: "Acordar (horário fixo)", p: "Âncora de tudo." },
  { h: "06:30–07:15", t: "Sem celular · água · luz · despejo mental", p: "Quebra o vício de validação cedo." },
  { h: "07:15–08:00", t: "Treino ou cardio", p: "Maior redutor de ansiedade." },
  { h: "08:30–11:00", t: "Bloco de pico — Carreira", p: "EstoqueZap + candidaturas + código." },
  { h: "11:00–12:30", t: "Faculdade (EAD)", p: "Bloco fixo." },
  { h: "Tarde", t: "Almoço + descanso + bloco flexível", p: "Descanso entra no plano." },
  { h: "Janela única", t: "Redes sociais 30–40 min", p: "Nunca a 1ª nem a última coisa do dia." },
  { h: "Noite", t: "Música / projeto criativo", p: "Criatividade tem hora." },
  { h: "21:30", t: "Leitura 25 min", p: "Troca direta: livro pela tela." },
  { h: "22:00", t: "Telas off", p: "Sono começa antes de deitar." },
  { h: "~23:00", t: "Dormir", p: "~7h30 de sono." },
];

const TEMPLATE_SEMANA = [
  "Treino: 4x/semana (3 força + 1 cardio)",
  "Carreira/EstoqueZap: 5x/semana (~2h30 manhã)",
  "Faculdade: bloco fixo separado do trabalho profundo",
  "Música: 2–3 noites ou fim de semana",
  "Finanças: 1x/semana, 30 min (sábado)",
  "Domingo: descanso + planejar a semana (15 min)",
];

export default function AgendaPage() {
  const { tarefas, diaHoje, toggleTarefa, criarTarefa, editarTarefa, removerTarefa, reordenarTarefas } = useApp();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<{ aberto: boolean; alvo?: TarefaReg }>({ aberto: false });
  const [verTemplate, setVerTemplate] = useState(false);

  const inegociaveis = tarefas.filter((t) => t.category === "inegociavel");
  const blocos = tarefas.filter((t) => t.category === "bloco");
  const feitos = inegociaveis.filter((t) => diaHoje.concluidas.includes(t.id)).length;

  async function salvar(dados: NovaTarefa) {
    if (form.alvo) await editarTarefa(form.alvo.id, dados);
    else await criarTarefa(dados);
    setForm({ aberto: false });
  }

  // Move uma tarefa para cima/baixo na lista global (ordem persistida).
  async function mover(id: string, dir: -1 | 1) {
    const ids = tarefas.map((t) => t.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await reordenarTarefas(ids);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted">
            {feitos}/{inegociaveis.length} inegociáveis · o tick do dia.
          </p>
        </div>
        <button
          onClick={() => setEditando((v) => !v)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
            editando ? "border-accent bg-accent-soft text-fg" : "border-line text-muted"
          }`}
        >
          {editando ? "Concluir" : "Editar"}
        </button>
      </header>

      {/* Atalhos semanais */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/revisao/" className="glass rounded-2xl p-4 transition-transform active:scale-95">
          <p className="text-2xl">📊</p>
          <p className="mt-1 text-sm font-bold">Revisão semanal</p>
          <p className="text-xs text-muted">Domingo, 15 min</p>
        </Link>
        <Link href="/financas/" className="glass rounded-2xl p-4 transition-transform active:scale-95">
          <p className="text-2xl">💸</p>
          <p className="mt-1 text-sm font-bold">Finanças</p>
          <p className="text-xs text-muted">Sábado, 30 min</p>
        </Link>
      </div>

      {editando ? (
        // ── Modo edição: lista plana, reordenável, com editar/excluir ──
        <section className="space-y-2.5">
          {tarefas.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg/60 text-lg">
                {t.icone}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.titulo}</p>
                <p className="text-xs text-muted">
                  {t.category === "inegociavel" ? "Inegociável" : "Bloco"}
                  {t.horario ? ` · ${t.horario}` : ""} · +{t.xp} XP
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconBtn label="Subir" disabled={i === 0} onClick={() => mover(t.id, -1)}>↑</IconBtn>
                <IconBtn label="Descer" disabled={i === tarefas.length - 1} onClick={() => mover(t.id, 1)}>↓</IconBtn>
                <IconBtn label="Editar" onClick={() => setForm({ aberto: true, alvo: t })}>✎</IconBtn>
                <IconBtn label="Excluir" perigo onClick={() => removerTarefa(t.id)}>✕</IconBtn>
              </div>
            </div>
          ))}

          <button
            onClick={() => setForm({ aberto: true })}
            className="w-full rounded-2xl border border-dashed border-line py-3.5 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
          >
            + Adicionar tarefa
          </button>
        </section>
      ) : (
        // ── Modo dia: agrupado, com o tick ──
        <>
          {inegociaveis.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle titulo="Inegociáveis" sub="A espinha. Mesmo no pior dia." />
              {inegociaveis.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  destaque
                  done={diaHoje.concluidas.includes(t.id)}
                  onToggle={() => toggleTarefa(t.id)}
                />
              ))}
            </section>
          )}

          {blocos.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle titulo="Blocos do dia" sub="Reforço. Cada um soma." />
              {blocos.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  done={diaHoje.concluidas.includes(t.id)}
                  onToggle={() => toggleTarefa(t.id)}
                />
              ))}
            </section>
          )}

          {tarefas.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              Sem tarefas. Toque em <b>Editar</b> para montar seu checklist.
            </p>
          )}
        </>
      )}

      {/* Template (referência) */}
      <section className="glass rounded-3xl p-5">
        <button
          onClick={() => setVerTemplate((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider">Template do dia</h2>
          <span className="text-muted">{verTemplate ? "−" : "+"}</span>
        </button>
        {verTemplate && (
          <>
            <ol className="mt-3 space-y-3">
              {TEMPLATE_DIA.map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs font-semibold text-accent">{r.h}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{r.t}</span>
                    <span className="block text-xs text-muted">{r.p}</span>
                  </span>
                </li>
              ))}
            </ol>
            <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wider">Semana</h3>
            <ul className="space-y-2">
              {TEMPLATE_SEMANA.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-accent">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {form.aberto && (
        <TarefaForm
          inicial={form.alvo}
          onSalvar={salvar}
          onCancelar={() => setForm({ aberto: false })}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  perigo,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  perigo?: boolean;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm transition-colors disabled:opacity-30 ${
        perigo ? "text-red-400 hover:border-red-400/50" : "text-muted hover:border-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-sm font-bold uppercase tracking-wider">{titulo}</h2>
      <span className="text-xs text-muted">{sub}</span>
    </div>
  );
}
