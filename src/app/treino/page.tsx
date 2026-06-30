"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Rotina } from "@/lib/db";
import { catalogoExercicios } from "@/lib/musculacao";
import { LogTreino } from "@/components/LogTreino";
import { RotinaEditor } from "@/components/RotinaEditor";
import { ExercicioDetalhesModal } from "@/components/ExercicioDetalhesModal";
import { CardioSemanalCard } from "@/components/CardioSemanalCard";
import { TreinoResumo } from "@/components/TreinoResumo";
import { CoachTreino } from "@/components/CoachTreino";

export default function TreinoPage() {
  const treinos = useLiveQuery(() => db.treinos.orderBy("inicio").reverse().toArray(), []) ?? [];
  const rotinas = useLiveQuery(() => db.rotinas.toArray(), []) ?? [];
  // Treino em andamento salvo
  const rascunho = useLiveQuery(() => db.rascunhoTreino.get("atual"), []) ?? null;

  const [logging, setLogging] = useState(false);
  const [retomando, setRetomando] = useState(false);
  const [rotinaSel, setRotinaSel] = useState<Rotina | null>(null);
  const [escolher, setEscolher] = useState(false);
  const [verRotinas, setVerRotinas] = useState(false);
  const [exercicioDetalhado, setExercicioDetalhado] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ aberta: boolean; rotina: Rotina | null }>({
    aberta: false,
    rotina: null,
  });

  const catalogo = catalogoExercicios(treinos);

  // Maior carga já feita por exercício (para detectar recordes no treino ativo)
  const recordes = useMemo(() => {
    const r: Record<string, number> = {};
    for (const t of treinos)
      for (const ex of t.exercicios)
        for (const s of ex.sets) if (s.peso > (r[ex.nome] ?? 0)) r[ex.nome] = s.peso;
    return r;
  }, [treinos]);

  // Sets da última sessão de cada exercício
  const anteriores = useMemo(() => {
    const m: Record<string, { peso: number; reps: number }[]> = {};
    for (const t of treinos)
      for (const ex of t.exercicios)
        if (!m[ex.nome]) m[ex.nome] = ex.sets.map((s) => ({ peso: s.peso, reps: s.reps }));
    return m;
  }, [treinos]);

  function iniciar(rot: Rotina | null) {
    setRotinaSel(rot);
    setRetomando(false);
    setEscolher(false);
    setLogging(true);
  }

  function retomar() {
    setRetomando(true);
    setEscolher(false);
    setLogging(true);
  }

  function fecharLog() {
    setLogging(false);
    setRetomando(false);
    setRotinaSel(null);
  }

  if (logging) {
    return (
      <LogTreino
        rotina={retomando ? null : rotinaSel}
        rascunho={retomando ? rascunho : null}
        catalogo={catalogo}
        recordes={recordes}
        anteriores={anteriores}
        onFechar={fecharLog}
      />
    );
  }

  if (editor.aberta) {
    return (
      <RotinaEditor
        rotina={editor.rotina}
        catalogo={catalogo}
        onFechar={() => setEditor({ aberta: false, rotina: null })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Treino</h1>
        <p className="text-sm text-muted">Selecione uma rotina ou inicie um treino vazio.</p>
      </header>

      {rascunho && rascunho.exercicios.length > 0 && (
        <button
          onClick={retomar}
          className="w-full rounded-2xl py-3.5 font-bold text-bg active:scale-95 transition-transform"
          style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--accent) inset" }}
        >
          ▶ Retomar treino em andamento
          <span className="ml-1 block text-xs font-medium opacity-80">
            {rascunho.titulo} · {rascunho.exercicios.length} exercícios
          </span>
        </button>
      )}

      <button
        onClick={() => setEscolher((v) => !v)}
        className="w-full rounded-2xl bg-accent py-3.5 font-bold text-bg active:scale-95 transition-transform"
      >
        Iniciar treino
      </button>

      {escolher && (
        <div className="glass space-y-2 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Escolha a rotina</p>
          <button onClick={() => iniciar(null)} className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold hover:text-accent transition-colors">
            Treino vazio
          </button>
          {rotinas.map((r) => (
            <button
              key={r.id}
              onClick={() => iniciar(r)}
              className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold active:scale-95 hover:text-accent transition-colors"
            >
              {r.nome} <span className="text-muted">· {r.exercicios.length} ex.</span>
            </button>
          ))}
        </div>
      )}

      {/* Coach de treino: aponta músculos em déficit na semana */}
      <CoachTreino treinos={treinos} />

      {/* Resumo com gráficos (30 dias + séries por músculo) */}
      <TreinoResumo treinos={treinos} />

      {/* Análise completa (heatmap, radar, ranking, recordes) */}
      <Link
        href="/treino/estatisticas/"
        className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl">
          📊
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Análise completa</p>
          <p className="text-xs text-muted">Heatmap corporal, distribuição muscular, ranking e recordes</p>
        </div>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      {/* Meta de Cardio Semanal */}
      <CardioSemanalCard />

      {/* Rotinas (editáveis) — recolhidas por padrão */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setVerRotinas((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted"
          >
            Minhas rotinas <span className="text-[10px]">({rotinas.length})</span>
            <span>{verRotinas ? "▲" : "▼"}</span>
          </button>
          <button
            onClick={() => setEditor({ aberta: true, rotina: null })}
            className="text-xs text-accent underline outline-none"
          >
            + nova
          </button>
        </div>
        {verRotinas && (rotinas.length === 0 ? (
          <p className="text-xs text-muted italic py-2 pl-1">Nenhuma rotina cadastrada ainda.</p>
        ) : (
          rotinas.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.nome}</p>
                  <p className="text-xs text-muted">{r.exercicios.length} exercícios</p>
                </div>
                <button
                  onClick={() => setEditor({ aberta: true, rotina: r })}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold active:scale-95 hover:border-accent hover:text-accent transition-colors outline-none"
                >
                  editar
                </button>
              </div>
              {/* Tags de exercício clicáveis */}
              <div className="flex flex-wrap gap-1.5 border-t border-line/20 pt-2">
                {r.exercicios.map((ex) => (
                  <button
                    key={ex.nome}
                    onClick={() => setExercicioDetalhado(ex.nome)}
                    className="rounded-lg bg-bg/25 px-2 py-0.5 text-[9px] font-medium text-muted hover:text-accent hover:bg-accent/10 border border-line/10 transition-colors outline-none"
                  >
                    {ex.nome}
                  </button>
                ))}
              </div>
            </div>
          ))
        ))}
      </section>

      {/* Modal de Detalhes de Exercício */}
      {exercicioDetalhado && (
        <ExercicioDetalhesModal
          nome={exercicioDetalhado}
          treinos={treinos}
          onFechar={() => setExercicioDetalhado(null)}
        />
      )}
    </div>
  );
}
