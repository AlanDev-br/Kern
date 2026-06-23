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
  type CartaoLeitura,
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
import { seedTreinosSeNecessario } from "./treino-seed";
import { seedBibliotecaSeNecessario } from "./biblioteca-seed";
import { agendar, marcarLido, type NotaRevisao } from "./biblioteca";
import { xpForca as calcularXpForca, type PerfilFisico } from "./forca";

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
  cartoes: CartaoLeitura[];
  xpForca: number; // XP acumulado por recordes de treino
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
  // Biblioteca
  lerCartao: (id: string) => Promise<void>;
  revisarCartao: (id: string, nota: NotaRevisao) => Promise<void>;
  adicionarCartao: (dados: NovoCartao) => Promise<void>;
  removerCartao: (id: string) => Promise<void>;
  // Treino / força
  recarregarForca: () => Promise<void>;
  atualizarPerfil: (perfil: PerfilFisico) => Promise<void>;
}

// Campos que o usuário fornece ao capturar um trecho próprio.
export interface NovoCartao {
  livro: string;
  autor: string;
  tema: string;
  titulo: string;
  ideia: string;
  citacao?: string;
  pergunta?: string;
}

const ctxVazio: ConquistaContexto = {
  xpTotal: 0,
  streakAtual: 0,
  melhorStreak: 0,
  diasComCheck: 0,
  diasFechados: 0,
  maxTreinosSemana: 0,
  maxLeituraSemana: 0,
  conceitosLidos: 0,
  revisoesTotais: 0,
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

// Detecta conquistas e temas recém-desbloqueados a partir de um contexto novo,
// persiste as conquistas e devolve as celebrações a enfileirar. Compartilhado
// pelo fluxo de tarefas e pelas ações da Biblioteca.
async function detectarDesbloqueios(
  ctx: ConquistaContexto,
  conquistasIds: string[],
  temasAntesIds: string[],
): Promise<{ fila: Celebracao[]; conquistasIds: string[]; temasDisp: ThemeDef[] }> {
  const fila: Celebracao[] = [];

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
    fila,
    conquistasIds: [...conquistasIds, ...novas],
    temasDisp: agoraTemas,
  };
}

// Recalcula contexto + desbloqueios após uma mudança nos cartões da Biblioteca.
// Usado pelas ações de leitura/revisão para refletir o novo XP no nível, temas e
// conquistas, sem tocar no checklist diário.
async function recomputarBiblioteca(
  cartoes: CartaoLeitura[],
  conquistasIds: string[],
  temasAntesIds: string[],
  xpForcaAtual: number,
): Promise<{ ctx: ConquistaContexto; fila: Celebracao[]; conquistasIds: string[]; temasDisp: ThemeDef[] }> {
  const dias = await getTodosDias();
  const ctx = construirContexto(dias, cartoes, xpForcaAtual);
  const desb = await detectarDesbloqueios(ctx, conquistasIds, temasAntesIds);
  return { ctx, fila: desb.fila, conquistasIds: desb.conquistasIds, temasDisp: desb.temasDisp };
}

// Lógica central compartilhada por toggleTarefa e marcarConcluida.
async function aplicarConcluidas(
  diaAntes: DiaRegistro,
  concluidas: string[],
  conquistasIds: string[],
  temasAntesIds: string[],
  cartoes: CartaoLeitura[],
  xpForcaAtual: number,
): Promise<Resultado> {
  const fechouAntes = diaAntes.fechouInegociaveis;
  const { xp, fechouInegociaveis } = calcularXpDia(concluidas);
  const novoDia: DiaRegistro = { ...diaAntes, concluidas, xp, fechouInegociaveis };
  await salvarDia(novoDia);

  const dias = await getTodosDias();
  const ctx = construirContexto(dias, cartoes, xpForcaAtual);

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

  const desb = await detectarDesbloqueios(ctx, conquistasIds, temasAntesIds);

  return {
    novoDia,
    dias,
    ctx,
    conquistasIds: desb.conquistasIds,
    temasDisp: desb.temasDisp,
    fila: [...fila, ...desb.fila],
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
  cartoes: [],
  xpForca: 0,
  fila: [],

  carregar: async () => {
    await seedTreinosSeNecessario(); // embute o histórico de treino na 1ª vez
    await seedBibliotecaSeNecessario(); // semeia os conceitos curados na 1ª vez
    const config = await getConfig();
    const dias = await getTodosDias();
    const diaHoje = await getDia(hojeChave());
    const cartoes = await db.leituras.toArray();
    const treinos = await db.treinos.toArray();
    const xpForca = calcularXpForca(treinos, config.perfil ?? null);
    const ctx = construirContexto(dias, cartoes, xpForca);
    const conquistasIds = (await db.conquistas.toArray()).map((c) => c.id);
    aplicarTema(config.temaAtivo);
    set({
      carregado: true,
      config,
      dias,
      diaHoje,
      cartoes,
      xpForca,
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
    const { cartoes, xpForca } = get();
    const ctx = construirContexto(dias, cartoes, xpForca);
    set({ dias, ctx, temasDisp: temasDesbloqueados(ctx.xpTotal) });
  },

  toggleTarefa: async (id: string) => {
    const { diaHoje, conquistasIds, temasDisp, cartoes, xpForca } = get();
    const concluidas = diaHoje.concluidas.includes(id)
      ? diaHoje.concluidas.filter((x) => x !== id)
      : [...diaHoje.concluidas, id];
    const r = await aplicarConcluidas(
      diaHoje,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
      cartoes,
      xpForca,
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
    const { diaHoje, conquistasIds, temasDisp, cartoes, xpForca } = get();
    if (diaHoje.concluidas.includes(id)) return;
    const concluidas = [...diaHoje.concluidas, id];
    const r = await aplicarConcluidas(
      diaHoje,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
      cartoes,
      xpForca,
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
    const { diaHoje, conquistasIds, temasDisp, cartoes, xpForca } = get();
    const base = { ...diaHoje, acordarManual: hhmm };
    const concluidas = base.concluidas.includes("ineg-acordar")
      ? base.concluidas
      : [...base.concluidas, "ineg-acordar"];
    const r = await aplicarConcluidas(
      base,
      concluidas,
      conquistasIds,
      temasDisp.map((t) => t.id),
      cartoes,
      xpForca,
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

  // Marca a 1ª leitura de um conceito: dá XP e o coloca no ciclo de revisão.
  lerCartao: async (id: string) => {
    const { cartoes, conquistasIds, temasDisp, xpForca } = get();
    const alvo = cartoes.find((c) => c.id === id);
    if (!alvo || alvo.lido) return;
    const atualizado = marcarLido(alvo);
    await db.leituras.put(atualizado);
    const novos = cartoes.map((c) => (c.id === id ? atualizado : c));
    const r = await recomputarBiblioteca(novos, conquistasIds, temasDisp.map((t) => t.id), xpForca);
    set({
      cartoes: novos,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // Aplica uma nota de revisão (difícil/ok/fácil) e reagenda o cartão.
  revisarCartao: async (id: string, nota: NotaRevisao) => {
    const { cartoes, conquistasIds, temasDisp, xpForca } = get();
    const alvo = cartoes.find((c) => c.id === id);
    if (!alvo) return;
    const atualizado = agendar(alvo, nota);
    await db.leituras.put(atualizado);
    const novos = cartoes.map((c) => (c.id === id ? atualizado : c));
    const r = await recomputarBiblioteca(novos, conquistasIds, temasDisp.map((t) => t.id), xpForca);
    set({
      cartoes: novos,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // Captura um trecho próprio do usuário; já entra como lido e agendado.
  adicionarCartao: async (dados: NovoCartao) => {
    const { cartoes, conquistasIds, temasDisp, xpForca } = get();
    const hoje = hojeChave();
    const novo: CartaoLeitura = {
      id: crypto.randomUUID(),
      origem: "meu",
      livro: dados.livro,
      autor: dados.autor,
      tema: dados.tema,
      titulo: dados.titulo,
      ideia: dados.ideia,
      citacao: dados.citacao,
      pergunta: dados.pergunta,
      caixa: 0,
      proximaRevisao: hoje, // entra já no ciclo de revisão
      revisoes: 0,
      lido: true,
      criadoEm: hoje,
    };
    await db.leituras.put(novo);
    const novos = [...cartoes, novo];
    const r = await recomputarBiblioteca(novos, conquistasIds, temasDisp.map((t) => t.id), xpForca);
    set({
      cartoes: novos,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
      fila: [...get().fila, ...r.fila],
    });
  },

  // Remove um cartão (apenas trechos próprios são removíveis pela UI).
  removerCartao: async (id: string) => {
    const { cartoes, conquistasIds, temasDisp, xpForca } = get();
    await db.leituras.delete(id);
    const novos = cartoes.filter((c) => c.id !== id);
    const r = await recomputarBiblioteca(novos, conquistasIds, temasDisp.map((t) => t.id), xpForca);
    set({
      cartoes: novos,
      ctx: r.ctx,
      conquistasIds: r.conquistasIds,
      temasDisp: r.temasDisp,
    });
  },

  // Recalcula o XP de força a partir do histórico de treino (ex.: após concluir
  // um treino com novo recorde) e reflete no nível/temas.
  recarregarForca: async () => {
    const { cartoes, config } = get();
    const treinos = await db.treinos.toArray();
    const xpForca = calcularXpForca(treinos, config?.perfil ?? null);
    const dias = await getTodosDias();
    const ctx = construirContexto(dias, cartoes, xpForca);
    set({ xpForca, ctx, temasDisp: temasDesbloqueados(ctx.xpTotal) });
  },

  // Salva o perfil físico e recalcula a classificação/XP de força.
  atualizarPerfil: async (perfil: PerfilFisico) => {
    const config = await persistConfig({ perfil });
    const { cartoes } = get();
    const treinos = await db.treinos.toArray();
    const xpForca = calcularXpForca(treinos, perfil);
    const dias = await getTodosDias();
    const ctx = construirContexto(dias, cartoes, xpForca);
    set({ config, xpForca, ctx, temasDisp: temasDesbloqueados(ctx.xpTotal) });
  },

  proximaCelebracao: () => {
    set({ fila: get().fila.slice(1) });
  },
}));

export { getTema };
