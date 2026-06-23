"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Rotina } from "@/lib/db";
import {
  volumeSemanal,
  avaliarVolume,
  catalogoExercicios,
  LANDMARKS,
  type StatusVolume,
} from "@/lib/musculacao";
import { LogTreino } from "@/components/LogTreino";
import { RotinaEditor } from "@/components/RotinaEditor";

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

  const [logging, setLogging] = useState(false);
  const [rotinaSel, setRotinaSel] = useState<Rotina | null>(null);
  const [escolher, setEscolher] = useState(false);
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

  function iniciar(rot: Rotina | null) {
    setRotinaSel(rot);
    setEscolher(false);
    setLogging(true);
  }

  if (logging) {
    return (
      <LogTreino
        rotina={rotinaSel}
        catalogo={catalogo}
        recordes={recordes}
        onFechar={() => setLogging(false)}
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

      {/* Volume semanal por grupo */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider">Volume desta semana</h2>
        <p className="mb-3 text-[11px] text-muted">séries/semana por grupo · faixa ideal (MEV–MRV) p/ natural</p>
        <div className="space-y-2.5">
          {avs.map((a) => {
            const [mev, , mrv] = LANDMARKS[a.grupo];
            const pct = mrv > 0 ? Math.min(100, (a.series / mrv) * 100) : 0;
            const mevPct = mrv > 0 ? Math.min(100, (mev / mrv) * 100) : 0;
            return (
              <div key={a.grupo}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{a.grupo}</span>
                  <span className="text-muted">
                    {a.series} <span className="opacity-60">/ {mrv}</span>
                  </span>
                </div>
                <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: COR_STATUS[a.status] }}
                  />
                  <div className="absolute top-0 h-full w-px bg-fg/40" style={{ left: `${mevPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Linha vertical = mínimo pra crescer (MEV). Verde = na faixa; amarelo = baixo/no teto; vermelho = excesso.
        </p>
      </section>

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

      {/* Histórico */}
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wider">Histórico</h2>
        {treinos.slice(0, 30).map((t) => {
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
      </section>
    </div>
  );
}
