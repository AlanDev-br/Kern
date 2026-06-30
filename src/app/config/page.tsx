"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useApp } from "@/lib/store";
import { db, type Treino } from "@/lib/db";
import { getTask } from "@/lib/plan-data";
import { pedirPermissaoNotificacoes, reagendarNotificacoes, ehNativo, agendarTeste, contarAgendadas } from "@/lib/notifications";
import { exportarBackup, importarBackup } from "@/lib/backup";
import { APPS_SOCIAIS } from "@/lib/social-apps";
import { ExercicioDetalhesModal } from "@/components/ExercicioDetalhesModal";
import { ComposicaoCorporal } from "@/components/ComposicaoCorporal";
import { grupoDoExercicio, GRUPOS } from "@/lib/musculacao";
import { estimar1RM } from "@/lib/forca";
import {
  tempoTelaDisponivel,
  obterEstadoLimitador,
  definirLimitesConfig,
  pedirPermissaoSobreposicao,
  temPermissaoTempoTela,
  pedirPermissaoTempoTela,
} from "@/lib/screen-time";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const CAMPOS_HORARIO: { chave: string; label: string }[] = [
  { chave: "ineg-acordar", label: "Acordar" },
  { chave: "ineg-treino", label: "Treino" },
  { chave: "bloco-carreira", label: "Carreira" },
  { chave: "ineg-leitura", label: "Leitura" },
  { chave: "bloco-telasoff", label: "Telas off" },
  { chave: "financas", label: "Finanças (sáb)" },
  { chave: "revisao", label: "Revisão (dom)" },
];

export default function ConfigPage() {
  const { config, atualizarConfig, tarefas } = useApp();
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Estados dos Ajustes do Limitador
  const [limiterEnabled, setLimiterEnabled] = useState(false);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [hasOverlay, setHasOverlay] = useState(false);
  const [hasUsageStats, setHasUsageStats] = useState(false);
  const [nativoDisponivel, setNativoDisponivel] = useState(false);
  const [carregandoLimites, setCarregandoLimites] = useState(true);

  // Controles de Sub-Gavetas (Modal/Sheet)
  const [gavetaAberta, setGavetaAberta] = useState<"exercicios" | "medicoes" | "calendario" | "ajustes" | null>(null);

  // Estados de Busca e Filtro de Exercícios
  const [buscaEx, setBuscaEx] = useState("");
  const [grupoFiltrado, setGrupoFiltrado] = useState("Todos");
  const [exercicioDetalhado, setExercicioDetalhado] = useState<string | null>(null);

  // Estados do Gráfico do Perfil
  const [graficoMetrica, setGraficoMetrica] = useState<"duracao" | "volume" | "repeticoes">("duracao");
  const [timeframe, setTimeframe] = useState<"1m" | "3m" | "tudo">("3m");

  // Estado do Calendário de Treinos
  const [mesCalendario, setMesCalendario] = useState(() => new Date());

  // Histórico de treinos recolhido por padrão (evita poluir o perfil); mostra
  // só os mais recentes até o usuário pedir para ver tudo.
  const [verHistorico, setVerHistorico] = useState(false);
  const HISTORICO_PREVIEW = 2;

  // Consulta de treinos do Dexie
  const treinos = useLiveQuery(() => db.treinos.orderBy("inicio").reverse().toArray(), []) ?? [];

  // Calcular segunda-feira desta semana
  const obterSegundaFeira = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Tempo total de treino na semana atual (minutos)
  const tempoSemanalMin = useMemo(() => {
    const segunda = obterSegundaFeira();
    let totalMs = 0;
    for (const t of treinos) {
      const tDate = new Date(t.inicio);
      if (tDate >= segunda) {
        const fimMs = t.fim ? new Date(t.fim).getTime() : tDate.getTime() + 60 * 60 * 1000;
        totalMs += (fimMs - tDate.getTime());
      }
    }
    return Math.round(totalMs / 60000);
  }, [treinos]);

  const textoTempoSemanal = useMemo(() => {
    const h = Math.floor(tempoSemanalMin / 60);
    const m = tempoSemanalMin % 60;
    if (h === 0 && m === 0) return "0 horas esta semana";
    if (h === 0) return `${m} min esta semana`;
    if (m === 0) return `${h} ${h === 1 ? "hora" : "horas"} esta semana`;
    return `${h}h ${m}m esta semana`;
  }, [tempoSemanalMin]);

  // Filtragem e preparação de dados para o gráfico de barras
  const dadosGrafico = useMemo(() => {
    const agora = Date.now();
    let limite = agora - 90 * 86400000; // 3 meses por padrão
    if (timeframe === "1m") limite = agora - 30 * 86400000;
    else if (timeframe === "tudo") limite = 0;

    const filtrados = treinos
      .filter((t) => new Date(t.inicio).getTime() >= limite)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    return filtrados.map((t) => {
      const tInicio = new Date(t.inicio);
      const label = tInicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

      // Duração em horas
      const ms = t.fim ? new Date(t.fim).getTime() - tInicio.getTime() : 60 * 60 * 1000;
      const duracaoHrs = Math.max(0.1, Math.round((ms / 3600000) * 10) / 10);

      // Volume total acumulado
      let volumeTotal = 0;
      let totalReps = 0;
      for (const ex of t.exercicios) {
        for (const s of ex.sets) {
          volumeTotal += s.peso * s.reps;
          totalReps += s.reps;
        }
      }

      return {
        label,
        duracao: duracaoHrs,
        volume: volumeTotal,
        repeticoes: totalReps,
        dataRaw: tInicio,
      };
    });
  }, [treinos, timeframe]);

  // Lista agregada de estatísticas por exercício (para a aba de Exercícios)
  const statsExercicios = useMemo(() => {
    const map: Record<string, { nome: string; grupo: string; recorde: number; max1rm: number; sessoes: number }> = {};
    for (const t of treinos) {
      const exNoTreino = new Set<string>();
      for (const ex of t.exercicios) {
        exNoTreino.add(ex.nome);
        if (!map[ex.nome]) {
          map[ex.nome] = {
            nome: ex.nome,
            grupo: grupoDoExercicio(ex.nome),
            recorde: 0,
            max1rm: 0,
            sessoes: 0,
          };
        }
        for (const s of ex.sets) {
          if (s.peso > map[ex.nome].recorde) {
            map[ex.nome].recorde = s.peso;
          }
          const rm = estimar1RM(s.peso, s.reps);
          if (rm > map[ex.nome].max1rm) {
            map[ex.nome].max1rm = rm;
          }
        }
      }
      for (const exNome of exNoTreino) {
        map[exNome].sessoes += 1;
      }
    }
    return Object.values(map).sort((a, b) => b.sessoes - a.sessoes || a.nome.localeCompare(b.nome));
  }, [treinos]);

  const exerciciosFiltrados = useMemo(() => {
    return statsExercicios.filter((ex) => {
      const bateNome = ex.nome.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(
        buscaEx.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      );
      const bateGrupo = grupoFiltrado === "Todos" || ex.grupo === grupoFiltrado;
      return bateNome && bateGrupo;
    });
  }, [statsExercicios, buscaEx, grupoFiltrado]);

  // Dias treinados para renderizar no calendário
  const diasTreinados = useMemo(() => {
    const set = new Set<string>();
    for (const t of treinos) {
      const dStr = new Date(t.inicio).toISOString().split("T")[0];
      set.add(dStr);
    }
    return set;
  }, [treinos]);

  // Carregar configurações do limitador (Android)
  useEffect(() => {
    async function carregarLimiter() {
      if (tempoTelaDisponivel()) {
        setNativoDisponivel(true);
        const state = await obterEstadoLimitador();
        setLimiterEnabled(state.enabled);
        setLimits(state.limits || {});
        setHasOverlay(state.hasOverlayPermission);
        
        const usageOk = await temPermissaoTempoTela();
        setHasUsageStats(usageOk);
      }
      setCarregandoLimites(false);
    }
    carregarLimiter();
  }, []);

  // Monitorar permissões ao reabrir aplicativo
  useEffect(() => {
    async function revalidaPermissoes() {
      if (document.visibilityState === "visible" && tempoTelaDisponivel()) {
        const state = await obterEstadoLimitador();
        setHasOverlay(state.hasOverlayPermission);
        const usageOk = await temPermissaoTempoTela();
        setHasUsageStats(usageOk);
      }
    }
    document.addEventListener("visibilitychange", revalidaPermissoes);
    return () => document.removeEventListener("visibilitychange", revalidaPermissoes);
  }, []);

  if (!config) return null;

  // Atualizar Horários de Lembretes
  async function setHorario(chave: string, valor: string) {
    const horarios = { ...config!.horarios, [chave]: valor };
    await atualizarConfig({ horarios });
    await reagendarNotificacoes({ ...config!, horarios }, tarefas);
  }

  // Ativar/Desativar Notificações
  async function toggleNotif() {
    const ativas = !config!.notificacoesAtivas;
    if (ativas) {
      const ok = await pedirPermissaoNotificacoes();
      if (!ok) {
        setMsg("Permissão de notificação negada.");
        return;
      }
    }
    await atualizarConfig({ notificacoesAtivas: ativas });
    await reagendarNotificacoes({ ...config!, notificacoesAtivas: ativas }, tarefas);
    setMsg(ativas ? "Notificações ativadas." : "Notificações desativadas.");
  }

  // Toggle do Limitador StayFree
  async function toggleLimiter() {
    const nextVal = !limiterEnabled;
    setLimiterEnabled(nextVal);
    await definirLimitesConfig(limits, nextVal);
    setMsg(nextVal ? "Limitador de foco ativado." : "Limitador de foco desativado.");
  }

  // Ajustar limite de app social específico
  async function atualizarLimiteApp(pkg: string, min: number) {
    const novosLimites = { ...limits, [pkg]: min };
    setLimits(novosLimites);
    await definirLimitesConfig(novosLimites, limiterEnabled);
  }

  // Pedir permissões no Android
  async function solicitarSobreposicao() {
    await pedirPermissaoSobreposicao();
    setTimeout(async () => {
      const state = await obterEstadoLimitador();
      setHasOverlay(state.hasOverlayPermission);
    }, 1500);
  }

  async function solicitarAcessoUso() {
    await pedirPermissaoTempoTela();
    setTimeout(async () => {
      const ok = await temPermissaoTempoTela();
      setHasUsageStats(ok);
    }, 1500);
  }

  // Exportação/Importação Backup
  async function exportar() {
    try {
      await exportarBackup();
      setMsg("Backup exportado com sucesso.");
    } catch {
      setMsg("Erro ao exportar backup.");
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      await importarBackup(txt);
      setMsg("Backup importado. Recarregando...");
      setTimeout(() => location.reload(), 800);
    } catch {
      setMsg("Arquivo de backup inválido.");
    }
  }

  // Formatação de data legível
  function formatarDataFeed(isoStr: string) {
    const d = new Date(isoStr);
    const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "long" });
    const diaMes = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
    return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}, ${diaMes}`;
  }

  // Cálculo dos dias a exibir na gaveta do Calendário
  const diasMesCalendario = () => {
    const ano = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const totais = [];
    // Ajuste do início da semana (segunda-feira)
    let startDay = primeiroDia.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Ajusta domingo

    // Preenchimento com dias em branco do mês anterior
    for (let i = 0; i < startDay; i++) {
      totais.push(null);
    }

    // Dias do mês atual
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const dataObj = new Date(ano, mes, d);
      const dataStr = dataObj.toISOString().split("T")[0];
      totais.push({ d, dataStr });
    }

    return totais;
  };

  // Alterar mês do calendário
  const mudarMes = (dir: number) => {
    setMesCalendario((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Centralizado com Botão de Configurações */}
      <header className="flex items-center justify-between pt-1">
        <span className="text-sm font-bold text-muted">Editar Perfil</span>
        <h1 className="text-base font-bold tracking-tight">alannicholas94</h1>
        <button
          onClick={() => setGavetaAberta("ajustes")}
          className="text-xl text-muted hover:text-fg p-1 outline-none transition-colors"
          aria-label="Configurações do aplicativo"
        >
          ⚙
        </button>
      </header>

      {msg && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-3.5 text-xs font-semibold text-accent flex justify-between items-center animate-pulse">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-muted text-sm ml-2">✕</button>
        </div>
      )}

      {/* Cartão do Perfil (Hevy-style) */}
      <section className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-5">
          {/* Avatar Circular */}
          <div className="h-16 w-16 rounded-full border border-line bg-card flex-shrink-0 overflow-hidden relative">
            <div className="h-full w-full bg-gradient-to-tr from-accent/20 to-accent/40 flex items-center justify-center text-2xl font-bold text-accent">
              AN
            </div>
          </div>

          {/* Estatísticas Numéricas */}
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-base font-extrabold text-fg">{treinos.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted font-medium mt-0.5">Treinos</p>
            </div>
            <div>
              <p className="text-base font-extrabold text-fg">0</p>
              <p className="text-[9px] uppercase tracking-wider text-muted font-medium mt-0.5">Seguidores</p>
            </div>
            <div>
              <p className="text-base font-extrabold text-fg">0</p>
              <p className="text-[9px] uppercase tracking-wider text-muted font-medium mt-0.5">Seguindo</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold leading-tight">Alan Nicholas</h2>
          <p className="text-xs text-muted mt-0.5">@alannicholas94</p>
        </div>
      </section>

      {/* Gráfico de Barras de Treino */}
      <section className="glass rounded-3xl p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-base font-extrabold text-accent">{textoTempoSemanal}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Tempo de Treino</p>
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs text-fg font-semibold outline-none"
          >
            <option value="1m">Último Mês</option>
            <option value="3m">Últimos 3 Meses</option>
            <option value="tudo">Tudo</option>
          </select>
        </div>

        {/* Gráfico Recharts BarChart */}
        <div className="h-44 w-full bg-card/10 rounded-2xl p-2 border border-line/10">
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 10,
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar
                  dataKey={graficoMetrica}
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {dadosGrafico.map((entry, index) => {
                    const isThisWeek = new Date(entry.dataRaw) >= obterSegundaFeira();
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isThisWeek ? "var(--accent)" : "rgba(var(--accent-rgb, 34, 197, 94), 0.5)"}
                        stroke="var(--accent)"
                        strokeWidth={isThisWeek ? 0 : 1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted">
              Nenhum treino registrado neste período.
            </div>
          )}
        </div>

        {/* Seletores da Métrica do Gráfico */}
        <div className="flex rounded-xl bg-card p-0.5 border border-line">
          {(["duracao", "volume", "repeticoes"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setGraficoMetrica(m)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                graficoMetrica === m ? "bg-accent text-bg" : "text-muted hover:text-fg"
              }`}
            >
              {m === "duracao" ? "Duração" : m === "volume" ? "Volume" : "Repetições"}
            </button>
          ))}
        </div>
      </section>

      {/* Painel Grid 2x2 */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/treino/estatisticas/"
          className="glass flex flex-col items-center justify-center gap-2 p-4 text-center rounded-2xl active:scale-95 transition-transform"
        >
          <span className="text-xl">📈</span>
          <span className="text-xs font-bold text-fg uppercase tracking-wider">Estatísticas</span>
        </Link>

        <button
          onClick={() => setGavetaAberta("exercicios")}
          className="glass flex flex-col items-center justify-center gap-2 p-4 text-center rounded-2xl active:scale-95 transition-transform"
        >
          <span className="text-xl">💪</span>
          <span className="text-xs font-bold text-fg uppercase tracking-wider">Exercícios</span>
        </button>

        <button
          onClick={() => setGavetaAberta("medicoes")}
          className="glass flex flex-col items-center justify-center gap-2 p-4 text-center rounded-2xl active:scale-95 transition-transform"
        >
          <span className="text-xl">🧍</span>
          <span className="text-xs font-bold text-fg uppercase tracking-wider">Medições</span>
        </button>

        <button
          onClick={() => setGavetaAberta("calendario")}
          className="glass flex flex-col items-center justify-center gap-2 p-4 text-center rounded-2xl active:scale-95 transition-transform"
        >
          <span className="text-xl">📅</span>
          <span className="text-xs font-bold text-fg uppercase tracking-wider">Calendário</span>
        </button>
      </section>

      {/* Feed de Treinamentos (Histórico) — recolhido por padrão */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Treinamentos</h2>
          {treinos.length > HISTORICO_PREVIEW && (
            <button
              onClick={() => setVerHistorico((v) => !v)}
              className="text-xs font-semibold text-accent"
            >
              {verHistorico ? "Recolher" : `Ver tudo (${treinos.length})`}
            </button>
          )}
        </div>
        {treinos.length === 0 ? (
          <p className="text-xs text-muted italic pl-1 py-4">Nenhum treino registrado ainda.</p>
        ) : (
          <div className="space-y-4">
            {(verHistorico ? treinos : treinos.slice(0, HISTORICO_PREVIEW)).map((t) => {
              // Calcular tempo e volume do treino
              const tInicio = new Date(t.inicio);
              const ms = t.fim ? new Date(t.fim).getTime() - tInicio.getTime() : 60 * 60 * 1000;
              const mins = Math.round(ms / 60000);
              const hrs = Math.floor(mins / 60);
              const minsRestantes = mins % 60;
              const tempoStr = hrs > 0 ? `${hrs}h ${minsRestantes}m` : `${minsRestantes}m`;

              let volumeTreino = 0;
              for (const ex of t.exercicios) {
                for (const s of ex.sets) volumeTreino += s.peso * s.reps;
              }

              return (
                <div key={t.id} className="rounded-2xl border border-line bg-card p-4 space-y-3 shadow-md">
                  {/* Cabeçalho do Treino */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-accent/20 to-accent/30 flex items-center justify-center text-sm font-extrabold text-accent">
                      AN
                    </div>
                    <div>
                      <p className="text-xs font-bold text-fg leading-tight">alannicholas94</p>
                      <p className="text-[10px] text-muted mt-0.5">{formatarDataFeed(t.inicio)}</p>
                    </div>
                  </div>

                  {/* Informações da Sessão */}
                  <div>
                    <h3 className="text-sm font-bold text-fg">{t.titulo}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 rounded-xl bg-bg/25 border border-line/10 p-2.5 text-center text-xs">
                      <div>
                        <p className="text-muted text-[10px] uppercase tracking-wider font-semibold">Tempo</p>
                        <p className="font-extrabold text-fg mt-0.5">{tempoStr}</p>
                      </div>
                      <div>
                        <p className="text-muted text-[10px] uppercase tracking-wider font-semibold">Volume</p>
                        <p className="font-extrabold text-accent mt-0.5">{volumeTreino.toLocaleString("pt-BR")} kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Listagem de Exercícios realizados neste treino */}
                  <div className="space-y-1.5 border-t border-line/20 pt-3">
                    {t.exercicios.map((ex) => (
                      <button
                        key={ex.nome}
                        onClick={() => setExercicioDetalhado(ex.nome)}
                        className="w-full flex items-center justify-between text-left hover:text-accent outline-none text-xs transition-colors py-1"
                      >
                        <span className="font-bold text-fg/90">{ex.sets.length} × {ex.nome}</span>
                        <span className="text-[10px] text-muted">
                          {ex.sets.map((s) => `${s.peso}kg×${s.reps}`).slice(0, 3).join(" · ")}
                          {ex.sets.length > 3 ? "..." : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUB-GAVETAS E MODAIS                                          */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* Gaveta de Exercícios */}
      {gavetaAberta === "exercicios" && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
            <button onClick={() => setGavetaAberta(null)} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">
              ←
            </button>
            <h2 className="text-base font-bold tracking-tight">Biblioteca de Exercícios</h2>
            <div className="w-6" />
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28">
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Pesquisar exercício..."
                value={buscaEx}
                onChange={(e) => setBuscaEx(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2.5 text-xs text-fg outline-none focus:border-accent"
              />

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setGrupoFiltrado("Todos")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0 border transition-colors ${
                    grupoFiltrado === "Todos"
                      ? "bg-accent border-accent text-bg"
                      : "border-line text-muted"
                  }`}
                >
                  Todos
                </button>
                {GRUPOS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrupoFiltrado(g)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold shrink-0 border transition-colors ${
                      grupoFiltrado === g
                        ? "bg-accent border-accent text-bg"
                        : "border-line text-muted"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {exerciciosFiltrados.length === 0 ? (
                <p className="text-xs text-muted italic py-4 text-center">Nenhum exercício encontrado.</p>
              ) : (
                exerciciosFiltrados.map((ex) => (
                  <button
                    key={ex.nome}
                    onClick={() => setExercicioDetalhado(ex.nome)}
                    className="w-full flex items-center justify-between rounded-xl bg-card border border-line/40 p-3.5 hover:border-accent/40 text-left transition-colors active:scale-[0.98] outline-none"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-xs font-bold text-fg truncate">{ex.nome}</p>
                      <p className="text-[10px] text-muted font-medium mt-0.5">{ex.grupo}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="text-[10px] text-muted leading-tight">
                        <p><span className="font-semibold text-fg">PR:</span> {ex.recorde}kg</p>
                        <p className="mt-0.5"><span className="font-semibold text-fg">1RM:</span> {ex.max1rm}kg</p>
                      </div>
                      <div className="text-[10px] text-muted text-right">
                        <p className="font-bold text-accent">{ex.sessoes}</p>
                        <p className="text-[8px] uppercase tracking-widest text-muted mt-0.5">vezes</p>
                      </div>
                      <span className="text-muted text-sm font-semibold">→</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gaveta de Medições (Perfil Físico) */}
      {gavetaAberta === "medicoes" && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
            <button onClick={() => setGavetaAberta(null)} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">
              ←
            </button>
            <h2 className="text-base font-bold tracking-tight">Medições Corporais</h2>
            <div className="w-6" />
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-28">
            {/* Composição corporal: % gordura, massa muscular, IMC e metas */}
            <ComposicaoCorporal />

            {/* Peso e Gordura */}
            <div className="glass rounded-2xl p-4 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">Perfil Físico</h3>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Sexo</label>
                  <select
                    value={config.perfil?.sexo ?? "M"}
                    onChange={(e) =>
                      atualizarConfig({ perfil: { ...(config.perfil || { sexo: "M", pesoCorporal: 80, idade: 30 }), sexo: e.target.value as any } })
                    }
                    className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Idade (anos)</label>
                  <input
                    type="number"
                    value={config.perfil?.idade ?? ""}
                    onChange={(e) =>
                      atualizarConfig({ perfil: { ...(config.perfil || { sexo: "M", pesoCorporal: 80, idade: 30 }), idade: parseInt(e.target.value, 10) || 0 } })
                    }
                    className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Peso Corporal (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.perfil?.pesoCorporal ?? ""}
                    onChange={(e) =>
                      atualizarConfig({ perfil: { ...(config.perfil || { sexo: "M", pesoCorporal: 80, idade: 30 }), pesoCorporal: parseFloat(e.target.value) || 0 } })
                    }
                    className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Gordura %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.perfil?.gorduraPct ?? ""}
                    onChange={(e) =>
                      atualizarConfig({ perfil: { ...(config.perfil || { sexo: "M", pesoCorporal: 80, idade: 30 }), gorduraPct: parseFloat(e.target.value) || undefined } })
                    }
                    className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Medidas de Circunferência */}
            <div className="glass rounded-2xl p-4 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent">Circunferências (cm)</h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                {["Peito", "Braço Esq", "Braço Dir", "Cintura", "Quadril", "Coxa Esq", "Coxa Dir"].map((medida) => {
                  const chave = medida.toLowerCase().replace(" ", "");
                  const valor = config.perfil?.medidas?.[chave] ?? "";
                  return (
                    <div key={medida} className="space-y-1">
                      <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">{medida}</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="--"
                        value={valor}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const medidas = { ...(config.perfil?.medidas || {}), [chave]: val };
                          atualizarConfig({ perfil: { ...(config.perfil || { sexo: "M", pesoCorporal: 80, idade: 30 }), medidas } });
                        }}
                        className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => {
                setGavetaAberta(null);
                setMsg("Medições atualizadas com sucesso!");
              }}
              className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-bg active:scale-95 transition-transform"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Gaveta de Calendário */}
      {gavetaAberta === "calendario" && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
            <button onClick={() => setGavetaAberta(null)} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">
              ←
            </button>
            <h2 className="text-base font-bold tracking-tight">Calendário de Treinos</h2>
            <div className="w-6" />
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-28">
            {/* Seletor do Mês */}
            <div className="flex items-center justify-between bg-card border border-line p-3 rounded-2xl">
              <button onClick={() => mudarMes(-1)} className="text-base font-bold text-muted hover:text-fg px-2.5">
                ◀
              </button>
              <h3 className="text-sm font-bold uppercase tracking-wider text-fg">
                {mesCalendario.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => mudarMes(1)} className="text-base font-bold text-muted hover:text-fg px-2.5">
                ▶
              </button>
            </div>

            {/* Grid do Calendário */}
            <div className="glass rounded-3xl p-5 space-y-4">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted">
                {["S", "T", "Q", "Q", "S", "S", "D"].map((s, idx) => (
                  <span key={idx}>{s}</span>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-y-3.5 gap-x-1 text-center">
                {diasMesCalendario().map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  const treinado = diasTreinados.has(day.dataStr);
                  return (
                    <div key={day.dataStr} className="flex justify-center items-center relative">
                      <div
                        className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                          treinado
                            ? "bg-accent text-bg font-extrabold shadow-md shadow-accent/20"
                            : "text-muted/80 hover:bg-card/30"
                        }`}
                      >
                        {day.d}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line/40 bg-bg/30 p-4 text-xs text-muted leading-relaxed">
              <span className="font-semibold text-accent">• Dica:</span> Os dias destacados com cor neon indicam que você completou uma sessão de musculação.
            </div>
          </div>
        </div>
      )}

      {/* Gaveta de Configurações (Ajustes ⚙) */}
      {gavetaAberta === "ajustes" && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
            <button onClick={() => setGavetaAberta(null)} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">
              ←
            </button>
            <h2 className="text-base font-bold tracking-tight">Configurações</h2>
            <div className="w-6" />
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-28">
            {/* Data de início */}
            <section className="glass rounded-2xl p-4.5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Início dos 90 dias</h3>
              <input
                type="date"
                value={config.dataInicio}
                onChange={(e) => atualizarConfig({ dataInicio: e.target.value })}
                className="w-full rounded-xl border border-line bg-bg/50 p-3 text-xs outline-none focus:border-accent font-semibold"
              />
            </section>

            {/* Notificações */}
            <section className="glass rounded-2xl p-4.5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Notificações</h3>
                  <p className="text-[10px] text-muted mt-0.5">
                    {ehNativo() ? "Lembretes no horário definido" : "Disponível no app Android"}
                  </p>
                </div>
                <button
                  onClick={toggleNotif}
                  className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                    config.notificacoesAtivas ? "bg-accent" : "bg-line"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      config.notificacoesAtivas ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2.5 border-t border-line/20 pt-3">
                {CAMPOS_HORARIO.map((c) => (
                  <div key={c.chave} className="flex items-center justify-between text-xs">
                    <span>
                      {getTask(c.chave)?.icone ?? "⏰"} {c.label}
                    </span>
                    <input
                      type="time"
                      value={config.horarios[c.chave] ?? ""}
                      onChange={(e) => setHorario(c.chave, e.target.value)}
                      className="rounded-lg border border-line bg-bg/50 px-2 py-1 text-xs outline-none focus:border-accent font-semibold"
                    />
                  </div>
                ))}
              </div>

              {ehNativo() && (
                <button
                  onClick={async () => {
                    const ok = await agendarTeste();
                    const n = await contarAgendadas();
                    setMsg(
                      ok
                        ? `Teste enviado! Deve chegar em ~8s. ${n} lembretes agendados.`
                        : "Permissão de notificação negada no Android.",
                    );
                    setGavetaAberta(null);
                  }}
                  className="w-full rounded-xl border border-line py-2 text-xs font-bold active:scale-95 transition-all"
                >
                  Testar Notificação (8s)
                </button>
              )}
            </section>

            {/* Limitador de Aplicativos (Foco) */}
            {nativoDisponivel && (
              <section className="glass rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Limites de Aplicativos</h3>
                    <p className="text-[10px] text-muted mt-0.5">StayFree — Bloqueio de redes sociais</p>
                  </div>
                  <button
                    onClick={toggleLimiter}
                    className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                      limiterEnabled ? "bg-accent" : "bg-line"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        limiterEnabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>

                {limiterEnabled && (
                  <div className="space-y-4 pt-3 border-t border-line/20">
                    {(!hasUsageStats || !hasOverlay) && (
                      <div className="rounded-xl bg-accent-soft border border-accent/20 p-3 space-y-2 text-xs">
                        <p className="font-bold text-accent">⚠️ Permissões Necessárias:</p>
                        
                        {!hasUsageStats && (
                          <div className="flex items-center justify-between text-muted">
                            <span>Acesso aos dados de uso</span>
                            <button onClick={solicitarAcessoUso} className="text-accent underline font-semibold">
                              autorizar
                            </button>
                          </div>
                        )}
                        
                        {!hasOverlay && (
                          <div className="flex items-center justify-between text-muted">
                            <span>Sobrepor a outros apps</span>
                            <button onClick={solicitarSobreposicao} className="text-accent underline font-semibold">
                              autorizar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Limites Diários:</p>
                      {APPS_SOCIAIS.map((app) => {
                        const valor = limits[app.pkg] || 0;
                        return (
                          <div key={app.pkg} className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 font-medium">
                              <span>{app.icone}</span>
                              <span>{app.nome}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="480"
                                value={valor || ""}
                                placeholder="off"
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  atualizarLimiteApp(app.pkg, val);
                                }}
                                className="w-16 rounded-lg border border-line bg-bg/50 px-2 py-1 text-right text-xs outline-none focus:border-accent font-semibold"
                              />
                              <span className="text-muted font-medium">min</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Backup */}
            <section className="glass rounded-2xl p-4.5 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Backup dos Dados</h3>
              <p className="text-[11px] text-muted leading-normal">
                Seus dados ficam locais no aparelho. Exporte regularmente para segurança.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={exportar}
                  className="rounded-xl bg-accent py-2 text-xs font-bold text-bg active:scale-95 transition-all"
                >
                  Exportar
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-line py-2 text-xs font-bold active:scale-95 transition-all"
                >
                  Importar
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                onChange={onImport}
                className="hidden"
              />
              {config.ultimoBackup && (
                <p className="text-[9px] text-muted italic mt-1.5">Último backup: {config.ultimoBackup}</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Modal Reutilizável de Detalhes de Exercício */}
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
