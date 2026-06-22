"use client";

import { create } from "zustand";
import type {
  AppConfig,
  DiaRegistro,
  ConquistaContexto,
  ConquistaDef,
  ThemeDef,
} from "./types";
import {
  db,
  getConfig,
  setConfig as persistConfig,
  getDia,
  salvarDia,
  getTodosDias,
} from "./db";
import { hojeChave } from "./dates";
import {
  calcularXpDia,
  construirContexto,
  conquistasDesbloqueadas,
} from "./gamification";
import { CONQUISTAS, getTema, fraseDoMarco } from "./plan-data";
import { aplicarTema, temasDesbloqueados } from "./themes";
import { ehNativo, pedirPermissaoNotificacoes, reagendarNotificacoes, agendarCoach } from "./notifications";
import { direcionamentoPrincipal } from "./coach";

export interface Celebracao {
  tipo: "inegociaveis" | "conquista" | "tema" | "nivel";
  titulo: string;
  subtitulo: string;
  icone: string;
  frase?: string;
}

interface AppState {
  carregado: boolean;
  config: AppConfig | null;
  dias: DiaRegistro[];
  diaHoje: DiaRegistro;
  ctx: ConquistaContexto;
  conquistasIds: string[];
  temasDisp: ThemeDef[];
  fila: Celebracao[];

  carregar: () => Promise<void>;
  toggleTarefa: (id: string) => Promise<void>;
  marcarConcluida: (id: string) => Promise<void>;
  setAcordarManual: (hhmm: string) => Promise<void>;
  setDormirManual: (hhmm: string) => Promise<void>;
  setTema: (id: string) => Promise<void>;
  atualizarConfig: (patch: Partial<AppConfig>) => Promise<void>;
  proximaCelebracao: () => void;
  recarregarDias: () => Promise<void>;
}

const ctxVazio: ConquistaContexto = {
  xpTotal: 0,
  streakAtual: 0,
  melhorStreak: 0,
  diasComCheck: 0,
  diasFechados: 0,
  maxTreinosSemana: 0,
  maxLeituraSemana: 0,
};

// Resultado de aplicar uma nova lista de tarefas concluídas ao dia de hoje.
interface Resultado {
  novoDia: DiaRegistro;
  dias: DiaRegistro[];
  ctx: ConquistaContexto;
  conquistasIds: string[];
  temasDisp: ThemeDef[];
  fila: Celebracao[];
}

// Lógica central compartilhada por toggleTarefa e marcarConcluida.
async function aplicarConcluidas(
  diaAntes: DiaRegistro,
  concluidas: string[],
  conquistasIds: string[],
  temasAntesIds: string[],
): Promise<Resultado> {
  const fechouAntes = diaAntes.fechouInegociaveis;
  const { xp, fechouInegociaveis } = calcularXpDia(concluidas);
  const novoDia: DiaRegistro = { ...diaAntes, concluidas, xp, fechouInegociaveis };
  await salvarDia(novoDia);

  const dias = await getTodosDias();
  const ctx = construirContexto(dias);

  const fila: Celebracao[] = [];

  if (fechouInegociaveis && !fechouAntes) {
    fila.push({
      tipo: "inegociaveis",
      titulo: "Dia fechado!",
      subtitulo: `Streak de ${ctx.streakAtual} ${ctx.streakAtual === 1 ? "dia" : "dias"}`,
      icone: "🔥",
      frase: fraseDoMarco(ctx.streakAtual),
    });
  }

  const desbloqueadasAgora = conquistasDesbloqueadas(ctx);
  const novas = desbloqueadasAgora.filter((cid) => !conquistasIds.includes(cid));
  for (const cid of novas) {
    const def = CONQUISTAS.find((c) => c.id === cid) as ConquistaDef;
    await db.conquistas.put({ id: cid, data: hojeChave() });
    fila.push({
      tipo: "conquista",
      titulo: def.titulo,
      subtitulo: def.descricao,
      icone: def.icone,
    });
  }

  const agoraTemas = temasDesbloqueados(ctx.xpTotal);
  for (const t of agoraTemas) {
    if (!temasAntesIds.includes(t.id) && t.xpDesbloqueio > 0) {
      fila.push({
        tipo: "tema",
        titulo: `Tema ${t.nome} desbloqueado`,
        subtitulo: "Ative na tela de Troféus",
        icone: "🎨",
      });
    }
  }

  return {
    novoDia,
    dias,
    ctx,
    conquistasIds: [...conquistasIds, ...novas],
    temasDisp: agoraTemas,
    fila,
  };
}

export const useApp = create<AppState>((set, get) => ({
  carregado: false,
  config: null,
  dias: [],
  diaHoje: { data: hojeChave(), concluidas: [], fechouInegociaveis: false, xp: 0 },
  ctx: ctxVazio,
  conquistasIds: [],
  temasDisp: [],
  fila: [],

  carregar: async () => {
    const config = await getConfig();
    const dias = await getTodosDias();
    const diaHoje = await getDia(hojeChave());
    const ctx = construirContexto(dias);
    const conquistasIds = (await db.conquistas.toArray()).map((c) => c.id);
    aplicarTema(config.temaAtivo);
    set({
      carregado: true,
      config,
      dias,
      diaHoje,
      ctx,
      conquistasIds,
      temasDisp: temasDesbloqueados(ctx.xpTotal),
    });

    // Reagenda as notificações toda vez que o app abre (idempotente). Sem isso,
    // elas só eram agendadas ao mexer em Ajustes — e nada disparava.
    try {
      if (ehNativo() && config.notificacoesAtivas) {
        await pedirPermissaoNotificacoes();
        await reagendarNotificacoes(config);
        // notificação do coach com o direcionamento nº1 do dia
        const dir = direcionamentoPrincipal({ dias, diaHoje, ctx });
        await agendarCoach(`${dir.titulo} — ${dir.acao}`);
      }
    } catch {
      /* sem notificações disponíveis */
    }
  },

  recarregarDias: async () => {
    const dias = await getTodosDias();
    const ctx = construirContexto(dias);
    set({ dias, ctx, temasDisp: temasDesbloqueados(ctx.xpTotal) });
  },

  toggleTarefa: async (id: string) => {
    const { diaHoje, conquistasIds, temasDisp } = get();
    const concluidas = diaHoje.concluidas.includes(id)
      ? diaHoje.concluidas.filter((x) => x !== id)
      : [...diaHoje.concluidas, id];
    const r = await aplicarConcluidas(
      diaHoje,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
    );
    set({
      diaHoje: r.novoDia,
      dias: r.dias,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // marca como concluída sem desmarcar (idempotente) — usado pela auto-sync de saúde
  marcarConcluida: async (id: string) => {
    const { diaHoje, conquistasIds, temasDisp } = get();
    if (diaHoje.concluidas.includes(id)) return;
    const concluidas = [...diaHoje.concluidas, id];
    const r = await aplicarConcluidas(
      diaHoje,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
    );
    set({
      diaHoje: r.novoDia,
      dias: r.dias,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // define manualmente o horário de acordar e marca o inegociável correspondente
  setAcordarManual: async (hhmm: string) => {
    const { diaHoje, conquistasIds, temasDisp } = get();
    const base = { ...diaHoje, acordarManual: hhmm };
    const concluidas = base.concluidas.includes("ineg-acordar")
      ? base.concluidas
      : [...base.concluidas, "ineg-acordar"];
    const r = await aplicarConcluidas(
      base,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
    );
    set({
      diaHoje: r.novoDia,
      dias: r.dias,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // registra o horário que foi dormir (informativo, sem marcar tarefa)
  setDormirManual: async (hhmm: string) => {
    const { diaHoje } = get();
    const novoDia = { ...diaHoje, dormirManual: hhmm };
    await salvarDia(novoDia);
    set({ diaHoje: novoDia });
  },

  setTema: async (id: string) => {
    const config = await persistConfig({ temaAtivo: id });
    aplicarTema(id);
    set({ config });
  },

  atualizarConfig: async (patch: Partial<AppConfig>) => {
    const config = await persistConfig(patch);
    set({ config });
  },

  proximaCelebracao: () => {
    set({ fila: get().fila.slice(1) });
  },
}));

export { getTema };
