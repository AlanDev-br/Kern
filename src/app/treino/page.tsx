"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Rotina } from "@/lib/db";
import {
  volumeSemanal,
  avaliarVolume,
  catalogoExercicios,
  type StatusVolume,
} from "@/lib/musculacao";
import { LogTreino } from "@/components/LogTreino";
import { RotinaEditor } from "@/components/RotinaEditor";
import { VolumeColunas } from "@/components/VolumeColunas";
import { ClassificacaoForca } from "@/components/ClassificacaoForca";
import { Periodizacao } from "@/components/Periodizacao";
import { ImportarImagens } from "@/components/ImportarImagens";
import { ComposicaoCorporal } from "@/components/ComposicaoCorporal";

const COR_STATUS: Record<StatusVolume, string> = {
  baixo: "#fbbf24",
  ok: "var(--accent)",
  limite: "#fbbf24",
  excesso: "#fb7185",
};

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function TreinoPage() {
  const treinos = useLiveQuery(() => db.treinos.orderBy("inicio").reverse().toArray(), []) ?? [];
  const rotinas = useLiveQuery(() => db.rotinas.toArray(), []) ?? [];
  // treino em andamento salvo (sobrevive a um reinício do app)
  const rascunho = useLiveQuery(() => db.rascunhoTreino.get("atual"), []) ?? null;

  const [logging, setLogging] = useState(false);
  const [retomando, setRetomando] = useState(false);
  const [rotinaSel, setRotinaSel] = useState<Rotina | null>(null);
  const [escolher, setEscolher] = useState(false);
  const [historicoVisivel, setHistoricoVisivel] = useState(10); // paginação: 10 por vez
  const [editor, setEditor] = useState<{ aberta: boolean; rotina: Rotina | null }>({
    aberta: false,
    rotina: null,
  });

  const vol = volumeSemanal(treinos);
  const avs = avaliarVolume(vol);
  const catalogo = catalogoExercicios(treinos);
  const alertas = avs.filter((a) => a.status === "excesso" || a.status === "baixo");

  // maior carga já feita por exercício (para detectar recordes)
  const recordes = useMemo(() => {
    const r: Record<string, number> = {};
    for (const t of treinos)
      for (const ex of t.exercicios)
        for (const s of ex.sets) if (s.peso > (r[ex.nome] ?? 0)) r[ex.nome] = s.peso;
    return r;
  }, [treinos]);

  // sets da última sessão de cada exercício (treinos vem do mais recente p/ o + antigo)
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
        <p className="text-sm text-muted">Volume por grupo + coach natural.</p>
      </header>

      {rascunho && rascunho.exercicios.length > 0 && (
        <button
          onClick={retomar}
          className="w-full rounded-2xl py-3.5 font-bold text-bg active:scale-95"
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
        className="w-full rounded-2xl bg-accent py-3.5 font-bold text-bg active:scale-95"
      >
        Iniciar treino
      </button>

      {escolher && (
        <div className="glass space-y-2 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Escolha a rotina</p>
          <button onClick={() => iniciar(null)} className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold">
            Treino vazio
          </button>
          {rotinas.map((r) => (
            <button
              key={r.id}
              onClick={() => iniciar(r)}
              className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold active:scale-95"
            >
              {r.nome} <span className="text-muted">· {r.exercicios.length} ex.</span>
            </button>
          ))}
        </div>
      )}

      {/* Coach de volume */}
      {alertas.length > 0 && (
        <section className="glass rounded-3xl p-5" style={{ boxShadow: "inset 0 0 0 1px #fb7185" }}>
          <h2 className="text-sm font-bold uppercase tracking-wider">Coach — ajustes de volume</h2>
          <ul className="mt-2 space-y-2">
            {alertas.map((a) => (
              <li key={a.grupo} className="text-xs">
                <span className="font-bold" style={{ color: COR_STATUS[a.status] }}>
                  {a.grupo} ({a.series} séries):
                </span>{" "}
                <span className="text-muted">{a.mensagem}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Volume semanal por grupo — gráfico de colunas por zona */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider">Volume desta semana</h2>
        <p className="mb-4 text-[11px] text-muted">séries/semana por grupo · altura = teto recuperável (MRV)</p>
        <VolumeColunas avaliacoes={avs} />
        <p className="mt-3 text-[11px] text-muted">
          Linha tracejada = mínimo pra crescer (MEV).{" "}
          <span style={{ color: "var(--accent)" }}>verde</span> = faixa de hipertrofia;{" "}
          <span style={{ color: "#fbbf24" }}>amarelo</span> = baixo/no teto;{" "}
          <span style={{ color: "#fb7185" }}>vermelho</span> = excesso.
        </p>
      </section>

      {/* Classificação de força — rank por exercício e por grupo + mapa do corpo */}
      <ClassificacaoForca treinos={treinos} />

      {/* Composição corporal — IMC, gordura, metas e tempo estimado */}
      <ComposicaoCorporal />

      {/* Periodização para natural — guia baseado em evidência */}
      <Periodizacao />

      {/* Rotinas (editáveis) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider">Minhas rotinas</h2>
          <button
            onClick={() => setEditor({ aberta: true, rotina: null })}
            className="text-xs text-accent underline"
          >
            + nova
          </button>
        </div>
        {rotinas.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.nome}</p>
              <p className="text-xs text-muted">{r.exercicios.length} exercícios</p>
            </div>
            <button
              onClick={() => setEditor({ aberta: true, rotina: r })}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold"
            >
              editar
            </button>
          </div>
        ))}
      </section>

      {/* Importação em lote de imagens dos exercícios */}
      <ImportarImagens catalogo={catalogo} />

      {/* Histórico (paginado, 10 por vez) */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider">Histórico</h2>
          {treinos.length > 0 && (
            <span className="text-[11px] text-muted">
              {Math.min(historicoVisivel, treinos.length)} de {treinos.length}
            </span>
          )}
        </div>
        {treinos.slice(0, historicoVisivel).map((t) => {
          const totalSets = t.exercicios.reduce((s, e) => s + e.sets.length, 0);
          return (
            <div key={t.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">{t.titulo}</p>
                <p className="text-xs text-muted">{dataCurta(t.inicio)}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {t.exercicios.length} exercícios · {totalSets} séries
              </p>
            </div>
          );
        })}
        {treinos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Carregando seus treinos…</p>
        )}
        {historicoVisivel < treinos.length && (
          <button
            onClick={() => setHistoricoVisivel((n) => n + 10)}
            className="w-full rounded-2xl border border-line py-2.5 text-sm font-semibold text-accent active:scale-95"
          >
            Ver mais 10
          </button>
        )}
      </section>
    </div>
  );
}
