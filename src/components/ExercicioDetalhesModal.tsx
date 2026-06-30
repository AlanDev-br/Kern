"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { estimar1RM } from "@/lib/forca";
import { grupoDoExercicio } from "@/lib/musculacao";
import { resolverImagem } from "@/lib/exercise-images";
import type { Treino } from "@/lib/db";

// Modal reutilizável de detalhes do exercício contendo gráfico de progressão,
// recordes pessoais (PRs), histórico de execuções e instruções passo a passo.

interface ExercicioDetalhesModalProps {
  nome: string;
  treinos: Treino[];
  onFechar: () => void;
}

interface ExDbItem {
  name: string;
  targetMuscles: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
}

let cacheExdb: ExDbItem[] | null = null;

function traduzirMusculo(en: string): string {
  const map: Record<string, string> = {
    pectorals: "Peito",
    lats: "Costas",
    "upper back": "Costas",
    "lower back": "Lombar / Costas",
    delts: "Ombros",
    shoulders: "Ombros",
    biceps: "Bíceps",
    triceps: "Tríceps",
    quadriceps: "Quadríceps",
    hamstrings: "Posteriores",
    glutes: "Glúteos",
    calves: "Panturrilha",
    abs: "Core / Abdominais",
    waist: "Core / Oblíquos",
    forearms: "Antebraços",
    spine: "Costas / Erretores",
  };
  return map[en.toLowerCase()] ?? en;
}

export function ExercicioDetalhesModal({ nome, treinos, onFechar }: ExercicioDetalhesModalProps) {
  const [aba, setAba] = useState<"resumo" | "historico" | "instrucoes">("resumo");
  const [metric, setMetric] = useState<"peso" | "1rm" | "volume">("peso");
  const [filtroTempo, setFiltroTempo] = useState<"3m" | "ano" | "tudo">("ano");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [dadosEx, setDadosEx] = useState<ExDbItem | null>(null);

  // Carregar GIF animado
  useEffect(() => {
    resolverImagem(nome).then(setGifUrl);
  }, [nome]);

  // Carregar instruções e músculos secundários da base de dados local
  useEffect(() => {
    async function carregarEx() {
      try {
        if (!cacheExdb) {
          const resp = await fetch("/exercises.json");
          if (resp.ok) cacheExdb = await resp.json();
        }
        if (cacheExdb) {
          // Tokenizar e dar match no exercício correspondente
          const tokens = nome
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .split(/[\s()\-+º]+/g)
            .filter((w) => w.length > 2);

          let melhorMatch: ExDbItem | null = null;
          let melhorScore = 0;

          for (const item of cacheExdb) {
            const itemNomeNorm = item.name.toLowerCase();
            let score = 0;
            for (const t of tokens) {
              if (itemNomeNorm.includes(t)) score++;
            }
            if (score > melhorScore) {
              melhorScore = score;
              melhorMatch = item;
            }
          }
          // Confiança mínima: casar pelo menos 1 token de peso
          if (melhorScore >= 1) {
            setDadosEx(melhorMatch);
          }
        }
      } catch (e) {
        console.error("Erro ao ler exercises.json", e);
      }
    }
    carregarEx();
  }, [nome]);

  // Histórico de treinos em que este exercício foi executado
  const historicoEx = useMemo(() => {
    return treinos
      .filter((t) => t.exercicios.some((e) => e.nome === nome))
      .map((t) => {
        const ex = t.exercicios.find((e) => e.nome === nome)!;
        return {
          id: t.id,
          titulo: t.titulo,
          data: new Date(t.inicio),
          sets: ex.sets,
        };
      })
      .sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [treinos, nome]);

  // Dados para o gráfico de progressão
  const dadosGrafico = useMemo(() => {
    const limiteTempo = new Date();
    if (filtroTempo === "3m") limiteTempo.setMonth(limiteTempo.getMonth() - 3);
    else if (filtroTempo === "ano") limiteTempo.setFullYear(limiteTempo.getFullYear() - 1);
    else limiteTempo.setFullYear(limiteTempo.getFullYear() - 20); // Tudo

    const pontos = historicoEx
      .filter((h) => h.data >= limiteTempo)
      .map((h) => {
        const maiorPeso = Math.max(...h.sets.map((s) => s.peso), 0);
        const maior1rm = Math.max(...h.sets.map((s) => estimar1RM(s.peso, s.reps)), 0);
        const volumeTotal = h.sets.reduce((acc, s) => acc + s.peso * s.reps, 0);

        return {
          dataRaw: h.data,
          dataStr: h.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          peso: Math.round(maiorPeso),
          "1rm": Math.round(maior1rm),
          volume: Math.round(volumeTotal),
        };
      })
      .sort((a, b) => a.dataRaw.getTime() - b.dataRaw.getTime());

    return pontos;
  }, [historicoEx, filtroTempo]);

  // Recordes pessoais (PRs)
  const recordesPessoais = useMemo(() => {
    let maiorPeso = 0;
    let melhor1rm = 0;
    let melhorVolumeSerie = { peso: 0, reps: 0 };
    let melhorVolumeSessao = 0;

    for (const h of historicoEx) {
      let volumeSessao = 0;
      for (const s of h.sets) {
        if (s.peso > maiorPeso) maiorPeso = s.peso;
        const rm = estimar1RM(s.peso, s.reps);
        if (rm > melhor1rm) melhor1rm = rm;
        
        const volSerie = s.peso * s.reps;
        const bestVolSerie = melhorVolumeSerie.peso * melhorVolumeSerie.reps;
        if (volSerie > bestVolSerie) {
          melhorVolumeSerie = { peso: s.peso, reps: s.reps };
        }
        volumeSessao += volSerie;
      }
      if (volumeSessao > melhorVolumeSessao) melhorVolumeSessao = volumeSessao;
    }

    return {
      maiorPeso: Math.round(maiorPeso),
      melhor1rm: Math.round(melhor1rm),
      melhorVolumeSerie,
      melhorVolumeSessao: Math.round(melhorVolumeSessao),
    };
  }, [historicoEx]);

  // Mapeamento dos grupos musculares (primário e secundários)
  const musculosPrimarios = useMemo(() => {
    if (dadosEx) {
      return dadosEx.targetMuscles.map(traduzirMusculo).join(", ");
    }
    return grupoDoExercicio(nome);
  }, [dadosEx, nome]);

  const musculosSecundarios = useMemo(() => {
    if (dadosEx?.secondaryMuscles) {
      return dadosEx.secondaryMuscles.map(traduzirMusculo).join(", ");
    }
    return "Ombros, Tríceps (estimado)";
  }, [dadosEx]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <button
          onClick={onFechar}
          aria-label="Voltar"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card"
        >
          ←
        </button>
        <h2 className="truncate text-base font-bold tracking-tight">{nome}</h2>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-line">
        {(["resumo", "historico", "instrucoes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              aba === t ? "border-b-2 border-accent text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t === "resumo" ? "Resumo" : t === "historico" ? "Histórico" : "Instruções"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-20 space-y-6">
        {aba === "resumo" && (
          <>
            {/* Imagem / GIF animado do exercício */}
            <div className="flex justify-center rounded-3xl bg-card border border-line p-4 overflow-hidden aspect-video relative">
              {gifUrl ? (
                <img
                  src={gifUrl}
                  alt={nome}
                  className="h-full object-contain mix-blend-lighten opacity-80"
                  onError={() => setGifUrl(null)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted">
                  <span className="text-3xl">💪</span>
                  <span className="text-[10px] mt-1 uppercase tracking-wider">Sem animação local</span>
                </div>
              )}
            </div>

            {/* Músculos alvo */}
            <div className="space-y-1">
              <p className="text-xs text-muted">
                <span className="font-semibold text-fg">Primário:</span> {musculosPrimarios}
              </p>
              <p className="text-xs text-muted">
                <span className="font-semibold text-fg">Secundário:</span> {musculosSecundarios}
              </p>
            </div>

            {/* Seletor de Carga e Tempo do Gráfico */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {/* Métricas */}
                <div className="flex rounded-lg bg-card p-0.5 border border-line">
                  {(["peso", "1rm", "volume"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        metric === m ? "bg-accent text-bg" : "text-muted hover:text-fg"
                      }`}
                    >
                      {m === "peso" ? "Carga" : m === "1rm" ? "1RM" : "Volume"}
                    </button>
                  ))}
                </div>

                {/* Filtro tempo */}
                <select
                  value={filtroTempo}
                  onChange={(e) => setFiltroTempo(e.target.value as any)}
                  className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs text-fg font-semibold outline-none"
                >
                  <option value="3m">3 Meses</option>
                  <option value="ano">1 Ano</option>
                  <option value="tudo">Tudo</option>
                </select>
              </div>

              {/* Gráfico */}
              <div className="glass rounded-3xl p-4">
                <div className="h-44 w-full">
                  {dadosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosGrafico} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                        <defs>
                          <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="dataStr"
                          tick={{ fill: "var(--muted)", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--muted)", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          domain={["dataMin - 5", "dataMax + 5"]}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--line)",
                            borderRadius: 12,
                            fontSize: 11,
                          }}
                          labelStyle={{ color: "var(--muted)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey={metric}
                          stroke="var(--accent)"
                          strokeWidth={2.5}
                          fill="url(#metricGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted">
                      Registros insuficientes para exibir o gráfico neste período.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recordes Pessoais (PRs) */}
            <section className="glass rounded-3xl p-5 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                🏆 Recordes Pessoais
              </h3>
              <div className="divide-y divide-line/30 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Maior Carga</span>
                  <span className="font-bold text-accent">{recordesPessoais.maiorPeso} kg</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Melhor 1RM Estimado</span>
                  <span className="font-bold text-accent">{recordesPessoais.melhor1rm} kg</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Melhor Volume de Série</span>
                  <span className="font-bold text-accent">
                    {recordesPessoais.melhorVolumeSerie.peso} kg × {recordesPessoais.melhorVolumeSerie.reps} reps
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Melhor Volume de Sessão</span>
                  <span className="font-bold text-accent">{recordesPessoais.melhorVolumeSessao} kg</span>
                </div>
              </div>
            </section>
          </>
        )}

        {aba === "historico" && (
          <div className="space-y-4">
            {historicoEx.length === 0 ? (
              <p className="text-center text-xs text-muted py-8">Nenhum histórico registrado para este exercício.</p>
            ) : (
              historicoEx.map((h) => (
                <div key={h.id} className="rounded-2xl border border-line bg-card p-4 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold truncate max-w-[65%]">{h.titulo}</p>
                    <p className="text-[11px] text-muted font-medium">
                      {h.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                    {h.sets.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="font-semibold text-fg">Série {idx + 1}:</span>
                        <span className="tabular-nums">{s.peso}kg × {s.reps} {s.tipo === "warmup" ? "(Aquece)" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {aba === "instrucoes" && (
          <div className="glass rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Passo a Passo de Execução
            </h3>
            {dadosEx?.instructions && dadosEx.instructions.length > 0 ? (
              <ol className="space-y-3 text-xs leading-relaxed text-muted list-decimal list-inside pl-1">
                {dadosEx.instructions.map((inst, idx) => {
                  const limpo = inst.replace(/^step:\d+\s+/i, "");
                  return (
                    <li key={idx} className="marker:text-accent font-medium">
                      <span className="text-fg">{limpo}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-xs text-muted leading-relaxed">
                Mantenha a coluna neutra e execute o movimento de forma controlada. Concentre-se na contração do músculo alvo e evite impulsos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
