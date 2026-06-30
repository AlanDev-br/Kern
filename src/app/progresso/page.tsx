"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { useApp } from "@/lib/store";
import { db } from "@/lib/db";
import { ultimosDias } from "@/lib/dates";
import { nivelDoXp } from "@/lib/xp";
import { rankDoNivel } from "@/lib/rank";
import { calcularAtributos, classeGeral } from "@/lib/atributos";
import { scoreMente } from "@/lib/mente";

export default function ProgressoPage() {
  const ctx = useApp((s) => s.ctx);
  const xpForca = useApp((s) => s.xpForca);
  const dias = useApp((s) => s.dias);

  const cardios = useLiveQuery(() => db.cardios.toArray(), []) ?? [];
  const treinos = useLiveQuery(() => db.treinos.toArray(), []) ?? [];
  const avaliacoes = useLiveQuery(() => db.avaliacoesMente.orderBy("data").reverse().toArray(), []) ?? [];
  const testes = useLiveQuery(() => db.testesCognitivos.toArray(), []) ?? [];

  const menteScore = useMemo(() => {
    const limite = Date.now() - 60 * 86400000;
    const melhores: Record<string, number> = {};
    for (const t of testes) {
      if (new Date(t.data).getTime() < limite) continue;
      if (t.score > (melhores[t.tipo] ?? -1)) melhores[t.tipo] = t.score;
    }
    return scoreMente(avaliacoes[0] ?? null, melhores);
  }, [avaliacoes, testes]);

  const cardioMin = useMemo(() => cardios.reduce((s, c) => s + c.minutos, 0), [cardios]);

  const atributos = useMemo(
    () =>
      calcularAtributos({
        ctx,
        xpForca,
        cardioMin,
        treinosCount: treinos.length,
        menteScore,
      }),
    [ctx, xpForca, cardioMin, treinos.length, menteScore],
  );

  // Rank oficial = o MESMO do avatar (nível do XP), pra não divergir entre telas.
  const nivel = nivelDoXp(ctx.xpTotal);
  const rank = rankDoNivel(nivel.nivel);
  const mediaAtributos = useMemo(() => classeGeral(atributos).media, [atributos]);
  const radar = atributos.map((a) => ({ atributo: a.nome, valor: a.valor }));
  const grade = useMemo(() => ultimosDias(90), []);
  const mapa = useMemo(() => new Map(dias.map((d) => [d.data, d])), [dias]);

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
        <p className="text-sm text-muted">Seus atributos — a evidência virou poder.</p>
      </header>

      {/* Classe geral — mesmo rank do avatar (nível do XP) */}
      <section className="glass flex items-center justify-between rounded-3xl p-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Classe atual</p>
          <p className="text-2xl font-extrabold" style={{ color: rank.cor }}>{rank.nome}</p>
          <p className="text-xs text-muted">Nível {nivel.nivel} · {nivel.nome}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums">{mediaAtributos}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted">média atributos</p>
        </div>
      </section>

      {/* Radar de atributos */}
      <section className="glass rounded-3xl p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="78%" data={radar}>
              <PolarGrid stroke="var(--line)" />
              <PolarAngleAxis dataKey="atributo" tick={{ fill: "var(--muted)", fontSize: 10 }} />
              <Radar dataKey="valor" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Cartões por atributo */}
      <section className="grid grid-cols-2 gap-3">
        {atributos.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xl">{a.icone}</span>
              <span className="text-xs font-bold" style={{ color: a.cor }}>
                Nv {a.nivel}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-bold">{a.nome}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full" style={{ width: `${a.valor}%`, background: a.cor }} />
            </div>
            <p className="mt-1.5 text-[10px] leading-tight text-muted">{a.fonte}</p>
          </div>
        ))}
      </section>

      {/* Acesso ao módulo Mente */}
      <Link
        href="/mente/"
        className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl">🧠</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Avaliar inteligência</p>
          <p className="text-xs text-muted">Radar das múltiplas inteligências + testes cognitivos</p>
        </div>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      {/* Streak */}
      <div className="grid grid-cols-3 gap-2.5">
        <BigStat valor={`${ctx.streakAtual}`} label="streak atual" sufixo="🔥" />
        <BigStat valor={`${ctx.melhorStreak}`} label="melhor streak" />
        <BigStat valor={`${ctx.diasFechados}`} label="dias fechados" />
      </div>

      {/* Heatmap 90 dias */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Calendário dos 90 dias</h2>
        <div className="grid grid-cols-[repeat(15,1fr)] gap-1.5">
          {grade.map((k) => {
            const d = mapa.get(k);
            const intensidade = d?.fechouInegociaveis ? 1 : d && d.concluidas.length > 0 ? 0.45 : 0;
            return (
              <div
                key={k}
                title={k}
                className="aspect-square rounded-[4px] border border-line"
                style={{
                  background: intensidade > 0 ? `rgba(var(--glow), ${0.2 + intensidade * 0.7})` : "transparent",
                }}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BigStat({ valor, label, sufixo }: { valor: string; label: string; sufixo?: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-4 text-center">
      <p className="text-2xl font-extrabold text-gradient">
        {valor}
        {sufixo && <span className="text-base">{sufixo}</span>}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
