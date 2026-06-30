"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Treino } from "@/lib/db";
import { grupoDoExercicio, GRUPOS, type Grupo } from "@/lib/musculacao";

// Resumo de treino embutido na aba Treino: números palpáveis dos últimos 30 dias
// (com variação vs. os 30 anteriores) + tendência de séries por músculo (4 semanas).
// Independente da página /treino/estatisticas (que tem a análise completa).

const CORES_MUSCULO: Record<string, string> = {
  Peito: "#f97316",
  Costas: "#3b82f6",
  Ombros: "#eab308",
  Bíceps: "#a855f7",
  Tríceps: "#ec4899",
  Quadríceps: "#10b981",
  Posteriores: "#06b6d4",
  Glúteos: "#f43f5e",
  Panturrilha: "#84cc16",
  Core: "#14b8a6",
};

export function TreinoResumo({ treinos }: { treinos: Treino[] }) {
  const [musculos, setMusculos] = useState<string[]>(["Peito", "Costas", "Quadríceps"]);

  // Métricas 30d atuais vs 30d anteriores
  const stats = useMemo(() => {
    const agora = Date.now();
    const lim30 = agora - 30 * 86400000;
    const lim60 = agora - 60 * 86400000;

    const calc = (de: number, ate: number) => {
      let series = 0;
      let volume = 0;
      let duracao = 0;
      let n = 0;
      for (const t of treinos) {
        const ts = new Date(t.inicio).getTime();
        if (ts < de || ts >= ate) continue;
        n++;
        for (const ex of t.exercicios) {
          const validos = ex.sets.filter((s) => s.tipo !== "warmup");
          series += validos.length;
          volume += validos.reduce((a, s) => a + s.peso * s.reps, 0);
        }
        duracao += t.fim ? (new Date(t.fim).getTime() - ts) / 60000 : 60;
      }
      return { treinos: n, series, volume, duracao: Math.round(duracao) };
    };

    const atual = calc(lim30, agora);
    const ant = calc(lim60, lim30);
    const delta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : 0);
    return {
      atual,
      deltas: {
        treinos: delta(atual.treinos, ant.treinos),
        volume: delta(atual.volume, ant.volume),
        series: delta(atual.series, ant.series),
        duracao: delta(atual.duracao, ant.duracao),
      },
    };
  }, [treinos]);

  // Séries por grupo nas últimas 4 semanas
  const dadosSemanas = useMemo(() => {
    const agora = Date.now();
    const semanas = [3, 2, 1, 0].map((i) => ({
      label: i === 0 ? "Esta" : `${i + 1}sem`,
      de: agora - (i + 1) * 7 * 86400000,
      ate: agora - i * 7 * 86400000,
      grupos: Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>,
    }));
    for (const t of treinos) {
      const ts = new Date(t.inicio).getTime();
      const sem = semanas.find((s) => ts >= s.de && ts < s.ate);
      if (!sem) continue;
      for (const ex of t.exercicios) {
        const g = grupoDoExercicio(ex.nome);
        if (g in sem.grupos) sem.grupos[g] += ex.sets.filter((s) => s.tipo !== "warmup").length;
      }
    }
    return semanas.map((s) => ({ semana: s.label, ...s.grupos }));
  }, [treinos]);

  const toggle = (g: string) =>
    setMusculos((curr) =>
      curr.includes(g) ? (curr.length === 1 ? curr : curr.filter((x) => x !== g)) : [...curr, g],
    );

  return (
    <section className="glass rounded-3xl p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">Resumo · 30 dias</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted">vs. 30 dias antes</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card label="Treinos" valor={`${stats.atual.treinos}`} delta={stats.deltas.treinos} />
        <Card
          label="Volume"
          valor={stats.atual.volume >= 1000 ? `${(stats.atual.volume / 1000).toFixed(1)}k` : `${stats.atual.volume}`}
          sufixo=" kg"
          delta={stats.deltas.volume}
        />
        <Card label="Séries" valor={`${stats.atual.series}`} delta={stats.deltas.series} />
        <Card
          label="Tempo"
          valor={
            stats.atual.duracao >= 60
              ? `${Math.floor(stats.atual.duracao / 60)}h${stats.atual.duracao % 60}`
              : `${stats.atual.duracao}m`
          }
          delta={stats.deltas.duracao}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
          Séries por músculo · 4 semanas
        </p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosSemanas} margin={{ left: -22, right: 6, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.2} />
              <XAxis dataKey="semana" tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  fontSize: 11,
                }}
              />
              {musculos.map((g) => (
                <Line
                  key={g}
                  type="monotone"
                  dataKey={g}
                  stroke={CORES_MUSCULO[g] ?? "var(--accent)"}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CORES_MUSCULO[g] ?? "var(--accent)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {GRUPOS.filter((g) => g !== "Outro").map((g) => {
            const on = musculos.includes(g);
            const cor = CORES_MUSCULO[g] ?? "var(--accent)";
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] transition-all ${
                  on ? "border-line bg-card font-bold" : "border-transparent bg-bg/20 text-muted/60"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full border"
                  style={{ backgroundColor: on ? cor : "transparent", borderColor: on ? cor : "var(--line)" }}
                />
                {g}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Card({
  label,
  valor,
  sufixo = "",
  delta,
}: {
  label: string;
  valor: string;
  sufixo?: string;
  delta: number;
}) {
  const pos = delta >= 0;
  return (
    <div className="rounded-2xl border border-line/40 bg-card/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 text-lg font-black tabular-nums">
        {valor}
        <span className="text-xs font-medium text-muted">{sufixo}</span>
      </p>
      <p className={`mt-0.5 text-[10px] font-extrabold ${pos ? "text-accent" : "text-rose-400"}`}>
        {pos ? "↑" : "↓"} {Math.abs(delta)}%
      </p>
    </div>
  );
}
