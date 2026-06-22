"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Rotina } from "@/lib/db";
import {
  volumeSemanal,
  avaliarVolume,
  catalogoExercicios,
  LANDMARKS,
  type StatusVolume,
} from "@/lib/musculacao";
import { importarHevyCsv } from "@/lib/hevy-import";
import { LogTreino } from "@/components/LogTreino";

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
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const vol = volumeSemanal(treinos);
  const avs = avaliarVolume(vol);
  const catalogo = catalogoExercicios(treinos);
  const alertas = avs.filter((a) => a.status === "excesso" || a.status === "baixo");

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const r = await importarHevyCsv(txt);
      setMsg(`Importado: ${r.treinos} treinos, ${r.rotinas} rotinas, ${r.sets} séries.`);
    } catch {
      setMsg("Não consegui ler o CSV.");
    }
  }

  function iniciar(rot: Rotina | null) {
    setRotinaSel(rot);
    setEscolher(false);
    setLogging(true);
  }

  if (logging) {
    return <LogTreino rotina={rotinaSel} catalogo={catalogo} onFechar={() => setLogging(false)} />;
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
                  {/* marcador do mínimo eficaz (MEV) */}
                  <div className="absolute top-0 h-full w-px bg-fg/40" style={{ left: `${mevPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          A linha vertical = mínimo pra crescer (MEV). Verde = na faixa; amarelo = baixo/no teto; vermelho = excesso.
        </p>
      </section>

      {/* Histórico */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider">Histórico</h2>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-accent underline">
            importar do Hevy (CSV)
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={onImport} className="hidden" />
        </div>
        {msg && <p className="px-1 text-xs text-accent">{msg}</p>}
        {treinos.slice(0, 20).map((t) => {
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
          <p className="py-6 text-center text-sm text-muted">
            Sem treinos ainda. Importe o CSV do Hevy ou inicie um treino.
          </p>
        )}
      </section>
    </div>
  );
}
