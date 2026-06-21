"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import { useApp } from "@/lib/store";
import { ultimosDias, parseChave } from "@/lib/dates";
import { nivelDoXp } from "@/lib/xp";

export default function ProgressoPage() {
  const { dias, ctx } = useApp();
  const nivel = nivelDoXp(ctx.xpTotal);

  const mapa = useMemo(() => {
    const m = new Map(dias.map((d) => [d.data, d]));
    return m;
  }, [dias]);

  const grade = useMemo(() => ultimosDias(90), []);

  const serie = useMemo(() => {
    const chaves = ultimosDias(14);
    return chaves.map((k) => ({
      dia: parseChave(k).getDate().toString(),
      xp: mapa.get(k)?.xp ?? 0,
    }));
  }, [mapa]);

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
        <p className="text-sm text-muted">A evidência acumulada.</p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <BigStat valor={`${ctx.streakAtual}`} label="streak atual" sufixo="🔥" />
        <BigStat valor={`${ctx.melhorStreak}`} label="melhor streak" />
        <BigStat valor={`${ctx.diasFechados}`} label="dias fechados" />
      </div>

      {/* Heatmap 90 dias */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
          Calendário dos 90 dias
        </h2>
        <div className="grid grid-cols-[repeat(15,1fr)] gap-1.5">
          {grade.map((k) => {
            const d = mapa.get(k);
            const intensidade = d?.fechouInegociaveis
              ? 1
              : d && d.concluidas.length > 0
                ? 0.45
                : 0;
            return (
              <div
                key={k}
                title={k}
                className="aspect-square rounded-[4px] border border-line"
                style={{
                  background:
                    intensidade > 0
                      ? `rgba(var(--glow), ${0.2 + intensidade * 0.7})`
                      : "transparent",
                }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
          <span>menos</span>
          <span className="h-3 w-3 rounded-[3px] border border-line" />
          <span className="h-3 w-3 rounded-[3px]" style={{ background: "rgba(var(--glow),0.45)" }} />
          <span className="h-3 w-3 rounded-[3px]" style={{ background: "rgba(var(--glow),0.9)" }} />
          <span>mais</span>
        </div>
      </section>

      {/* XP últimos 14 dias */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">
          XP — últimos 14 dias
        </h2>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dia"
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted)" }}
              />
              <Area
                type="monotone"
                dataKey="xp"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#xpGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <p className="text-sm text-muted">Nível atual</p>
        <p className="text-xl font-bold">
          {nivel.nivel} · {nivel.nome}
        </p>
        <p className="mt-1 text-sm text-muted">{ctx.xpTotal} XP acumulados</p>
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
