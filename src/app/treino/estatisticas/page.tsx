"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { db } from "@/lib/db";
import { grupoDoExercicio, GRUPOS, type Grupo, volumeSemanal, avaliarVolume } from "@/lib/musculacao";
import { CorpoHeatmap } from "@/components/CorpoHeatmap";
import { ExercicioDetalhesModal } from "@/components/ExercicioDetalhesModal";
import { ClassificacaoForca } from "@/components/ClassificacaoForca";
import { VolumeColunas } from "@/components/VolumeColunas";
import { Periodizacao } from "@/components/Periodizacao";

// Página de estatísticas avançadas de treino.
// Calendário horizontal interativo + heatmap corporal diário, radar comparativo de distribuição,
// tendência de séries por músculo e ranking de exercícios mais praticados.

const CORES_MUSCULO: Record<string, string> = {
  Peito: "#f97316", // laranja
  Costas: "#3b82f6", // azul
  Ombros: "#eab308", // amarelo
  Bíceps: "#a855f7", // roxo
  Tríceps: "#ec4899", // rosa
  Quadríceps: "#10b981", // esmeralda
  Posteriores: "#06b6d4", // ciano
  Glúteos: "#f43f5e", // rosa choque
  Panturrilha: "#84cc16", // lima
  Core: "#14b8a6", // teal
};

const DIAS_SEMANA_SIGLA = ["D", "S", "T", "Q", "Q", "S", "S"];

// Volume ÓTIMO semanal (MAV) por região do radar — soma do MAV dos músculos que
// compõem cada eixo. Usado para normalizar a distribuição (séries ÷ alvo), pra
// músculos grandes/agregados não dominarem o gráfico só pelo volume absoluto.
const ALVO_REGIAO: Record<string, number> = {
  Peito: 16,
  Costas: 18,
  Ombros: 16,
  Braços: 28, // Bíceps 14 + Tríceps 14
  Pernas: 52, // Quad 14 + Post 12 + Glúteos 12 + Panturrilha 14
  Core: 12,
};

export default function EstatisticasPage() {
  const treinos = useLiveQuery(() => db.treinos.orderBy("inicio").toArray(), []) ?? [];

  // Estados
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [expandedSection, setExpandedSection] = useState<"radar" | "series" | "exercicios" | null>("radar");
  const [musculosSelecionados, setMusculosSelecionados] = useState<string[]>(["Peito", "Ombros", "Quadríceps"]);
  const [exercicioDetalhado, setExercicioDetalhado] = useState<string | null>(null);

  // 1. Calendário dos últimos 7 dias (incluindo hoje)
  const ultimos7Dias = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(d);
    }
    return list;
  }, []);

  // Verificar se há treinos em um determinado dia
  const temTreinoNoDia = (date: Date) => {
    const dataStr = date.toDateString();
    return treinos.some((t) => new Date(t.inicio).toDateString() === dataStr);
  };

  // Treinos no dia selecionado
  const treinosDoDia = useMemo(() => {
    const dataStr = selectedDate.toDateString();
    return treinos.filter((t) => new Date(t.inicio).toDateString() === dataStr);
  }, [treinos, selectedDate]);

  // Músculos trabalhados no dia selecionado
  const musculosDoDia = useMemo(() => {
    const musculos = new Set<Grupo>();
    for (const t of treinosDoDia) {
      for (const ex of t.exercicios) {
        musculos.add(grupoDoExercicio(ex.nome));
      }
    }
    return musculos;
  }, [treinosDoDia]);

  // 2. Estatísticas dos últimos 30 dias (Atual) vs 30 dias anteriores (Anterior)
  const statsPeriodo = useMemo(() => {
    const agora = Date.now();
    const limiteAtual = agora - 30 * 86400000;
    const limiteAnterior = agora - 60 * 86400000;

    const treinosAtual = treinos.filter((t) => {
      const ts = new Date(t.inicio).getTime();
      return ts >= limiteAtual && ts <= agora;
    });

    const treinosAnterior = treinos.filter((t) => {
      const ts = new Date(t.inicio).getTime();
      return ts >= limiteAnterior && ts < limiteAtual;
    });

    // Calcular métricas
    const calcularMetricas = (list: typeof treinos) => {
      let series = 0;
      let volume = 0;
      let duracao = 0; // em minutos

      for (const t of list) {
        let setsTreino = 0;
        let volumeTreino = 0;
        for (const ex of t.exercicios) {
          const setsValidos = ex.sets.filter((s) => s.tipo !== "warmup");
          setsTreino += setsValidos.length;
          volumeTreino += setsValidos.reduce((acc, s) => acc + s.peso * s.reps, 0);
        }
        series += setsTreino;
        volume += volumeTreino;

        // Duração do treino
        if (t.fim) {
          duracao += (new Date(t.fim).getTime() - new Date(t.inicio).getTime()) / 60000;
        } else {
          duracao += 60; // Padrão de 60 minutos caso não tenha hora final
        }
      }

      return {
        treinos: list.length,
        duracaoMin: Math.round(duracao),
        volumeKg: volume,
        series,
      };
    };

    const metAtual = calcularMetricas(treinosAtual);
    const metAnterior = calcularMetricas(treinosAnterior);

    // Calcular diferença (delta)
    const delta = (atual: number, anterior: number) => {
      const diff = atual - anterior;
      return {
        valor: Math.abs(diff),
        positivo: diff >= 0,
        pct: anterior > 0 ? Math.round((diff / anterior) * 100) : 0,
      };
    };

    return {
      atual: metAtual,
      anterior: metAnterior,
      deltas: {
        treinos: delta(metAtual.treinos, metAnterior.treinos),
        duracao: delta(metAtual.duracaoMin, metAnterior.duracaoMin),
        volume: delta(metAtual.volumeKg, metAnterior.volumeKg),
        series: delta(metAtual.series, metAnterior.series),
      },
      treinosAtual,
      treinosAnterior,
    };
  }, [treinos]);

  // 3. Distribuição Muscular - Radar Chart (Atual vs Anterior)
  const dadosRadar = useMemo(() => {
    const consolidarVolumeLandmarks = (list: typeof treinos) => {
      const vol: Record<string, number> = {
        Peito: 0,
        Costas: 0,
        Ombros: 0,
        Braços: 0, // Bíceps + Tríceps
        Pernas: 0, // Quad + Post + Gluteo + Panturrilha
        Core: 0,
      };

      for (const t of list) {
        for (const ex of t.exercicios) {
          const g = grupoDoExercicio(ex.nome);
          const series = ex.sets.filter((s) => s.tipo !== "warmup").length;

          if (g === "Peito") vol.Peito += series;
          else if (g === "Costas") vol.Costas += series;
          else if (g === "Ombros") vol.Ombros += series;
          else if (g === "Bíceps" || g === "Tríceps") vol.Braços += series;
          else if (g === "Quadríceps" || g === "Posteriores" || g === "Glúteos" || g === "Panturrilha") vol.Pernas += series;
          else if (g === "Core") vol.Core += series;
        }
      }
      return vol;
    };

    const volAtual = consolidarVolumeLandmarks(statsPeriodo.treinosAtual);
    const volAnterior = consolidarVolumeLandmarks(statsPeriodo.treinosAnterior);

    // Normaliza pelo alvo de volume (MAV) de cada região, escalado para a janela
    // de 30 dias (MAV é semanal). Assim "Pernas" (que agrega 4 músculos) não
    // domina o gráfico só por ter mais séries em valor absoluto — o radar passa a
    // mostrar % do volume ÓTIMO de cada região, ficando justo entre grupos.
    const norm = (regiao: string, v: number) =>
      Math.round((v / (ALVO_REGIAO[regiao] * (30 / 7))) * 100);

    return [
      { subject: "Peito", atual: norm("Peito", volAtual.Peito), anterior: norm("Peito", volAnterior.Peito) },
      { subject: "Costas", atual: norm("Costas", volAtual.Costas), anterior: norm("Costas", volAnterior.Costas) },
      { subject: "Ombros", atual: norm("Ombros", volAtual.Ombros), anterior: norm("Ombros", volAnterior.Ombros) },
      { subject: "Braços", atual: norm("Braços", volAtual.Braços), anterior: norm("Braços", volAnterior.Braços) },
      { subject: "Pernas", atual: norm("Pernas", volAtual.Pernas), anterior: norm("Pernas", volAnterior.Pernas) },
      { subject: "Core", atual: norm("Core", volAtual.Core), anterior: norm("Core", volAnterior.Core) },
    ];
  }, [statsPeriodo]);

  // 4. Séries Semanais por Músculo (Gráfico de linha de 4 semanas)
  const dadosLinhasSéries = useMemo(() => {
    const agora = Date.now();
    const semanas = [3, 2, 1, 0].map((i) => {
      const inicioSemana = agora - (i + 1) * 7 * 86400000;
      const fimSemana = agora - i * 7 * 86400000;
      return {
        label: i === 0 ? "Esta sem." : `${i + 1} sem. atrás`,
        inicio: inicioSemana,
        fim: fimSemana,
        setsPorGrupo: Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>,
      };
    });

    for (const t of treinos) {
      const ts = new Date(t.inicio).getTime();
      const sem = semanas.find((s) => ts >= s.inicio && ts < s.fim);
      if (!sem) continue;

      for (const ex of t.exercicios) {
        const g = grupoDoExercicio(ex.nome);
        if (g in sem.setsPorGrupo) {
          const sets = ex.sets.filter((s) => s.tipo !== "warmup").length;
          sem.setsPorGrupo[g] += sets;
        }
      }
    }

    return semanas.map((s) => ({
      semana: s.label,
      ...s.setsPorGrupo,
    }));
  }, [treinos]);

  // 5. Ranking de Exercícios Principais (Frequência nos últimos 30 dias)
  const exerciciosFrequentes = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const t of statsPeriodo.treinosAtual) {
      for (const ex of t.exercicios) {
        freq[ex.nome] = (freq[ex.nome] ?? 0) + 1;
      }
    }
    return Object.entries(freq)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [statsPeriodo]);

  // Toggles de seleção
  const toggleMusculoLinha = (g: string) => {
    setMusculosSelecionados((curr) => {
      if (curr.includes(g)) {
        if (curr.length === 1) return curr; // Não deixa zerar
        return curr.filter((x) => x !== g);
      }
      return [...curr, g];
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 pt-1">
        <Link href="/treino/" className="text-xl font-bold text-muted hover:text-fg">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estatísticas</h1>
          <p className="text-sm text-muted">Histórico de rendimento biométrico.</p>
        </div>
      </header>

      {/* Classificação de força — rank por grupo muscular (Bronze/Prata/Ouro) */}
      <ClassificacaoForca treinos={treinos} />

      {/* Calendário Semanal e Heatmap */}
      <section className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider">Última semana de treinos</h2>
          <span className="text-[10px] uppercase font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-full">
            Selecione o dia
          </span>
        </div>

        {/* Datas horizontais */}
        <div className="flex justify-between gap-1">
          {ultimos7Dias.map((d) => {
            const isSelected = d.toDateString() === selectedDate.toDateString();
            const diaSemanaStr = DIAS_SEMANA_SIGLA[d.getDay()];
            const diaNum = d.getDate();
            const worked = temTreinoNoDia(d);

            return (
              <button
                key={d.getTime()}
                onClick={() => setSelectedDate(d)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-accent text-bg border-accent font-bold scale-105"
                    : worked
                    ? "bg-accent/10 border-accent/40 text-fg"
                    : "bg-card/40 border-line/60 text-muted"
                }`}
              >
                <span className="text-[10px] opacity-75 uppercase leading-none mb-1">{diaSemanaStr}</span>
                <span className="text-sm font-extrabold tabular-nums leading-none">{diaNum}</span>
                {worked && !isSelected && (
                  <span className="h-1 w-1 rounded-full bg-accent mt-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Heatmap diário */}
        <div className="border border-line/30 rounded-2xl bg-bg/20 py-4 flex flex-col items-center">
          <CorpoHeatmap workedMuscles={musculosDoDia} />

          {/* Resumo do Treino do dia selecionado */}
          <div className="mt-3 px-5 text-center w-full">
            {treinosDoDia.length > 0 ? (
              <div className="space-y-1.5">
                {treinosDoDia.map((t) => {
                  const numSets = t.exercicios.reduce((acc, ex) => acc + ex.sets.length, 0);
                  return (
                    <div key={t.id} className="inline-block glass bg-card p-2 rounded-xl text-left w-full text-xs">
                      <p className="font-bold text-fg truncate">{t.titulo}</p>
                      <p className="text-[10px] text-muted font-medium mt-0.5">
                        {t.exercicios.length} exercícios · {numSets} séries · {t.fim ? "Concluído" : "Rascunho"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted">Nenhum treino registrado neste dia.</p>
            )}
          </div>
        </div>
      </section>

      {/* Estatísticas Avançadas List */}
      <div className="space-y-3">
        {/* Radar: Distribuição Muscular */}
        <div className="glass rounded-3xl p-5 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "radar" ? null : "radar")}
            className="flex w-full items-center justify-between font-bold text-xs uppercase tracking-wider text-fg"
          >
            <span>📊 Distribuição muscular (% do volume ótimo)</span>
            <span>{expandedSection === "radar" ? "▲" : "▼"}</span>
          </button>

          {expandedSection === "radar" && (
            <div className="mt-5 space-y-6">
              {/* Radar Chart */}
              <div className="h-56 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dadosRadar}>
                    <PolarGrid stroke="var(--line)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, "dataMax + 2"]} tick={false} axisLine={false} />
                    <Radar
                      name="Atual"
                      dataKey="atual"
                      stroke="var(--accent)"
                      fill="var(--accent)"
                      fillOpacity={0.25}
                    />
                    <Radar
                      name="Anterior"
                      dataKey="anterior"
                      stroke="#6b7280"
                      fill="#6b7280"
                      fillOpacity={0.1}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda do radar */}
              <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-fg">Atual (Últimos 30d)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted" />
                  <span className="text-muted">Anterior (30d antes)</span>
                </div>
              </div>

              {/* Grid de 4 cartões de estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Treinamentos"
                  valor={`${statsPeriodo.atual.treinos}`}
                  delta={statsPeriodo.deltas.treinos}
                  sufixo=""
                />
                <StatCard
                  label="Duração"
                  valor={
                    statsPeriodo.atual.duracaoMin >= 60
                      ? `${Math.floor(statsPeriodo.atual.duracaoMin / 60)}h ${statsPeriodo.atual.duracaoMin % 60}m`
                      : `${statsPeriodo.atual.duracaoMin} min`
                  }
                  delta={statsPeriodo.deltas.duracao}
                  sufixo=""
                />
                <StatCard
                  label="Volume"
                  valor={
                    statsPeriodo.atual.volumeKg >= 1000
                      ? `${(statsPeriodo.atual.volumeKg / 1000).toFixed(1)}k`
                      : `${statsPeriodo.atual.volumeKg}`
                  }
                  delta={statsPeriodo.deltas.volume}
                  sufixo=" kg"
                />
                <StatCard
                  label="Séries"
                  valor={`${statsPeriodo.atual.series}`}
                  delta={statsPeriodo.deltas.series}
                  sufixo=""
                />
              </div>
            </div>
          )}
        </div>

        {/* Tendência de Séries por Grupo Muscular */}
        <div className="glass rounded-3xl p-5 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "series" ? null : "series")}
            className="flex w-full items-center justify-between font-bold text-xs uppercase tracking-wider text-fg"
          >
            <span>📈 Contagem de Séries por Músculo</span>
            <span>{expandedSection === "series" ? "▲" : "▼"}</span>
          </button>

          {expandedSection === "series" && (
            <div className="mt-5 space-y-4">
              {/* Gráfico de Linha */}
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosLinhasSéries} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
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
                    {musculosSelecionados.map((g) => (
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

              {/* Filtro por muscle checkboxes */}
              <div className="grid grid-cols-2 gap-2 border-t border-line/30 pt-3">
                {GRUPOS.filter((g) => g !== "Outro").map((g) => {
                  const isChecked = musculosSelecionados.includes(g);
                  const cor = CORES_MUSCULO[g] ?? "var(--accent)";

                  return (
                    <button
                      key={g}
                      onClick={() => toggleMusculoLinha(g)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all border ${
                        isChecked
                          ? "bg-card border-line font-bold"
                          : "bg-bg/20 border-transparent text-muted/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full border transition-all ${
                            isChecked ? "" : "border-muted/40"
                          }`}
                          style={{
                            backgroundColor: isChecked ? cor : "transparent",
                            borderColor: isChecked ? cor : undefined,
                          }}
                        />
                        <span>{g}</span>
                      </div>
                      <span className="tabular-nums font-semibold opacity-60">
                        {/* total séries no período */}
                        {dadosLinhasSéries.reduce((acc, sem) => acc + (sem[g] ?? 0), 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Exercícios Principais / Ranking */}
        <div className="glass rounded-3xl p-5 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "exercicios" ? null : "exercicios")}
            className="flex w-full items-center justify-between font-bold text-xs uppercase tracking-wider text-fg"
          >
            <span>🏋️ Exercícios Principais (Ranking)</span>
            <span>{expandedSection === "exercicios" ? "▲" : "▼"}</span>
          </button>

          {expandedSection === "exercicios" && (
            <div className="mt-4 divide-y divide-line/30">
              {exerciciosFrequentes.length === 0 ? (
                <p className="text-center text-xs text-muted py-6">Registros insuficientes para listar exercícios.</p>
              ) : (
                exerciciosFrequentes.map((ex, idx) => (
                  <button
                    key={ex.nome}
                    onClick={() => setExercicioDetalhado(ex.nome)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-white/[0.02] px-1 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted w-4">{idx + 1}.</span>
                      <span className="text-xs font-semibold text-fg truncate">{ex.nome}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                      {ex.count} treinos
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Volume semanal por músculo (recolhível) */}
      <Recolhivel titulo="📊 Volume semanal por músculo">
        <VolumeColunas avaliacoes={avaliarVolume(volumeSemanal(treinos))} />
      </Recolhivel>

      {/* Periodização para treino natural (recolhível) */}
      <Recolhivel titulo="🗓 Periodização (treino natural)">
        <Periodizacao treinos={treinos} />
      </Recolhivel>

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

// Subcomponente de Cartão de Métrica
function StatCard({
  label,
  valor,
  delta,
  sufixo,
}: {
  label: string;
  valor: string;
  delta: { valor: number; positivo: boolean; pct: number };
  sufixo: string;
}) {
  return (
    <div className="glass bg-card/60 p-4 rounded-2xl relative border border-line/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="text-lg font-black mt-1.5 tabular-nums text-fg">
        {valor}
        <span className="text-xs font-medium text-muted">{sufixo}</span>
      </p>

      {/* Diferença percentual delta */}
      <div className="flex items-center gap-0.5 mt-1">
        <span
          className={`text-[10px] font-extrabold ${
            delta.positivo ? "text-accent" : "text-rose-400"
          }`}
        >
          {delta.positivo ? "↑" : "↓"}{" "}
          {delta.valor >= 1000 ? `${(delta.valor / 1000).toFixed(1)}k` : delta.valor} ({delta.pct}%)
        </span>
      </div>
    </div>
  );
}

// Seção colapsável (fechada por padrão) — mantém o app sem poluição visual.
function Recolhivel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="glass rounded-3xl p-5 overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-fg"
      >
        <span>{titulo}</span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && <div className="mt-4">{children}</div>}
    </div>
  );
}
