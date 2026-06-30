"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { db, type ResultadoCognitivo } from "@/lib/db";
import {
  INTELIGENCIAS,
  pontuarAvaliacao,
  salvarAvaliacao,
  salvarTeste,
} from "@/lib/mente";
import { TesteReacao, TesteDigitos, TesteStroop } from "@/components/MenteTestes";

type Modal = null | "quiz" | "reacao" | "digitos" | "stroop";

const TESTES: { tipo: ResultadoCognitivo["tipo"]; nome: string; icone: string; unidade: (v: number) => string }[] = [
  { tipo: "reacao", nome: "Velocidade (reação)", icone: "⚡", unidade: (v) => `${v}ms` },
  { tipo: "digitos", nome: "Memória de trabalho", icone: "🔢", unidade: (v) => `${v} dígitos` },
  { tipo: "stroop", nome: "Atenção / inibição", icone: "🎨", unidade: (v) => `${v}/s` },
];

export default function MentePage() {
  const [modal, setModal] = useState<Modal>(null);

  const avaliacoes = useLiveQuery(() => db.avaliacoesMente.orderBy("data").reverse().toArray(), []) ?? [];
  const testes = useLiveQuery(() => db.testesCognitivos.orderBy("data").reverse().toArray(), []) ?? [];
  const ultima = avaliacoes[0] ?? null;

  const ultimoPorTipo = useMemo(() => {
    const m: Record<string, ResultadoCognitivo> = {};
    for (const t of testes) if (!m[t.tipo]) m[t.tipo] = t; // testes vêm do mais recente
    return m;
  }, [testes]);

  const radar = ultima
    ? INTELIGENCIAS.map((i) => ({ nome: i.nome, valor: ultima.scores[i.id] ?? 0 }))
    : [];

  async function concluirTeste(tipo: ResultadoCognitivo["tipo"], valor: number, score: number) {
    await salvarTeste(tipo, valor, score);
    setModal(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 pt-1">
        <Link href="/progresso/" className="text-xl font-bold text-muted hover:text-fg">←</Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mente</h1>
          <p className="text-sm text-muted">Inteligência em vários âmbitos — não só exatas.</p>
        </div>
      </header>

      {/* Radar das múltiplas inteligências */}
      <section className="glass rounded-3xl p-4">
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider">Múltiplas inteligências</h2>
          <button onClick={() => setModal("quiz")} className="text-xs font-semibold text-accent">
            {ultima ? "Refazer" : "Avaliar"}
          </button>
        </div>
        {ultima ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radar}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="nome" tick={{ fill: "var(--muted)", fontSize: 9 }} />
                <Radar dataKey="valor" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="px-1 py-6 text-center text-sm text-muted">
            Faça a auto-avaliação pra montar seu mapa de inteligências.
          </p>
        )}
        <p className="px-1 text-[11px] text-muted">
          Auto-avaliação (Gardner + emocional). Honesto: é um retrato subjetivo — os testes abaixo são objetivos.
        </p>
      </section>

      {/* Testes cognitivos */}
      <section className="space-y-2.5">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wider">Testes cognitivos</h2>
        {TESTES.map((t) => {
          const ult = ultimoPorTipo[t.tipo];
          return (
            <div key={t.tipo} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg/60 text-xl">
                {t.icone}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{t.nome}</p>
                <p className="text-xs text-muted">
                  {ult ? `Último: ${t.unidade(ult.valor)} · ${ult.score}/100` : "Ainda não testado"}
                </p>
              </div>
              <button
                onClick={() => setModal(t.tipo)}
                className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-bg active:scale-95"
              >
                Testar
              </button>
            </div>
          );
        })}
        <p className="px-1 text-[11px] text-muted">
          Memória de trabalho, velocidade e atenção são pilares da inteligência fluida. Refaça com o tempo pra ver a
          evolução — eles alimentam o atributo 🧠 Inteligência.
        </p>
      </section>

      {modal === "quiz" && <Questionario onFechar={() => setModal(null)} />}
      {modal === "reacao" && (
        <TesteReacao onFechar={() => setModal(null)} onConcluir={(v, s) => concluirTeste("reacao", v, s)} />
      )}
      {modal === "digitos" && (
        <TesteDigitos onFechar={() => setModal(null)} onConcluir={(v, s) => concluirTeste("digitos", v, s)} />
      )}
      {modal === "stroop" && (
        <TesteStroop onFechar={() => setModal(null)} onConcluir={(v, s) => concluirTeste("stroop", v, s)} />
      )}
    </div>
  );
}

// Auto-avaliação: concordância 1..5 por inteligência.
function Questionario({ onFechar }: { onFechar: () => void }) {
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const completo = INTELIGENCIAS.every((i) => respostas[i.id]);

  async function salvar() {
    await salvarAvaliacao(pontuarAvaliacao(respostas));
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <button onClick={onFechar} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">←</button>
        <span className="text-sm font-bold">Auto-avaliação</span>
        <div className="w-10" />
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-4 text-sm text-muted">O quanto cada frase combina com você? (1 = nada · 5 = totalmente)</p>
        <div className="space-y-5">
          {INTELIGENCIAS.map((i) => (
            <div key={i.id}>
              <p className="text-sm font-semibold">
                {i.icone} {i.nome}
              </p>
              <p className="mb-2 text-xs text-muted">{i.afirmacao}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRespostas((r) => ({ ...r, [i.id]: n }))}
                    className={`h-10 flex-1 rounded-xl border text-sm font-bold transition-colors ${
                      respostas[i.id] === n ? "border-accent bg-accent-soft text-fg" : "border-line text-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line p-4">
        <button
          onClick={salvar}
          disabled={!completo}
          className="w-full rounded-xl bg-accent py-3 font-bold text-bg disabled:opacity-40"
        >
          {completo ? "Salvar avaliação" : "Responda todas"}
        </button>
      </div>
    </div>
  );
}
