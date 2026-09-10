"use client";

import { db, getConfig, salvarDia } from "./db";
import { chaveDia, hojeChave, parseChave } from "./dates";
import { calcularXpDia } from "./gamification";
import { listarTarefas } from "./tarefas";
import type { DiaRegistro } from "./types";

// ─────────────────────────────────────────────────────────────
// Fechamento dos dias que passaram
// ─────────────────────────────────────────────────────────────
// Antes disto, um dia em que o app não era aberto simplesmente NÃO EXISTIA em
// `dias`. Não era um dia zerado: era um buraco. O XP só somava, então faltar
// custava exatamente nada — só o streak percebia.
//
// Agora, ao carregar, todo dia entre o último registro e ontem que não tem
// registro ganha um, com as tarefas vazias e a penalidade aplicada. É isso que
// dá peso à ausência.
//
// Duas travas importantes:
//
// 1. Nada é retroativo. `penalidadeDesde` é gravado na primeira vez que esta
//    rotina roda e o fechamento nunca vai antes dessa data — senão quem já usava
//    o app perderia meses de XP de uma vez, punido por uma regra que não existia
//    quando ele deixou de abrir.
// 2. O dia de hoje nunca é fechado. Ele ainda está acontecendo.

// Teto de dias fechados de uma vez. Quem passou dois meses fora volta a um
// buraco, não a uma avalanche — e a conta não trava o carregamento.
const MAX_DIAS_RETROATIVOS = 30;

export async function fecharDiasPendentes(): Promise<{ fechados: number; xpPerdido: number }> {
  const config = await getConfig();
  const hoje = hojeChave();

  // Primeira execução: marca a data e não fecha nada. A regra passa a valer de
  // hoje em diante, para nunca cobrar um passado que não a conhecia.
  if (!config.penalidadeDesde) {
    await db.config.put({ ...config, penalidadeDesde: hoje });
    return { fechados: 0, xpPerdido: 0 };
  }

  const tarefas = await listarTarefas();
  if (!tarefas.length) return { fechados: 0, xpPerdido: 0 };

  const existentes = new Set((await db.dias.toArray()).map((d) => d.data));

  const inicioRegra = parseChave(config.penalidadeDesde);
  const ontem = parseChave(hoje);
  ontem.setDate(ontem.getDate() - 1);

  // Não recua além do teto, mesmo que a regra seja antiga.
  const limite = parseChave(hoje);
  limite.setDate(limite.getDate() - MAX_DIAS_RETROATIVOS);
  const inicio = inicioRegra > limite ? inicioRegra : limite;

  const novos: DiaRegistro[] = [];
  for (const d = new Date(inicio); d <= ontem; d.setDate(d.getDate() + 1)) {
    const chave = chaveDia(d);
    if (existentes.has(chave)) continue;
    const { xp, fechouInegociaveis } = calcularXpDia([], tarefas, { diaFechado: true });
    novos.push({ data: chave, concluidas: [], fechouInegociaveis, xp });
  }

  for (const dia of novos) await salvarDia(dia);

  return {
    fechados: novos.length,
    xpPerdido: novos.reduce((s, d) => s + Math.min(0, d.xp), 0),
  };
}
