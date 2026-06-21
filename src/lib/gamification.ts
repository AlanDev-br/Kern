import type { DiaRegistro, ConquistaContexto } from "./types";
import { chaveDia, chaveSemana, parseChave } from "./dates";
import { CONQUISTAS, INEGOCIAVEIS, BLOCOS, BONUS_INEGOCIAVEIS } from "./plan-data";

// Recalcula o XP de um dia a partir das tarefas concluídas.
export function calcularXpDia(concluidas: string[]): {
  xp: number;
  fechouInegociaveis: boolean;
} {
  const todas = [...INEGOCIAVEIS, ...BLOCOS];
  let xp = 0;
  for (const id of concluidas) {
    const t = todas.find((x) => x.id === id);
    if (t) xp += t.xp;
  }
  const fechouInegociaveis = INEGOCIAVEIS.every((t) => concluidas.includes(t.id));
  if (fechouInegociaveis) xp += BONUS_INEGOCIAVEIS;
  return { xp, fechouInegociaveis };
}

export function xpTotal(dias: DiaRegistro[]): number {
  return dias.reduce((s, d) => s + d.xp, 0);
}

// Streak = dias consecutivos (terminando hoje ou ontem) com os 3 inegociáveis.
export function calcularStreak(dias: DiaRegistro[]): {
  atual: number;
  melhor: number;
} {
  const fechados = new Set(
    dias.filter((d) => d.fechouInegociaveis).map((d) => d.data),
  );

  // streak atual
  let atual = 0;
  const hoje = new Date();
  // se hoje ainda não foi fechado, conta a partir de ontem (não quebra o streak no meio do dia)
  const cursor = new Date(hoje);
  if (!fechados.has(chaveDia(hoje))) cursor.setDate(cursor.getDate() - 1);
  while (fechados.has(chaveDia(cursor))) {
    atual++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // melhor streak histórico
  const ordenados = [...fechados].sort();
  let melhor = 0;
  let run = 0;
  let anterior: Date | null = null;
  for (const chave of ordenados) {
    const d = parseChave(chave);
    if (anterior && (d.getTime() - anterior.getTime()) === 86400000) {
      run++;
    } else {
      run = 1;
    }
    melhor = Math.max(melhor, run);
    anterior = d;
  }
  melhor = Math.max(melhor, atual);

  return { atual, melhor };
}

function maxPorSemana(dias: DiaRegistro[], taskId: string): number {
  const porSemana = new Map<string, number>();
  for (const d of dias) {
    if (d.concluidas.includes(taskId)) {
      const k = chaveSemana(parseChave(d.data));
      porSemana.set(k, (porSemana.get(k) ?? 0) + 1);
    }
  }
  let max = 0;
  for (const v of porSemana.values()) max = Math.max(max, v);
  return max;
}

export function construirContexto(dias: DiaRegistro[]): ConquistaContexto {
  const { atual, melhor } = calcularStreak(dias);
  return {
    xpTotal: xpTotal(dias),
    streakAtual: atual,
    melhorStreak: melhor,
    diasComCheck: dias.filter((d) => d.concluidas.length > 0).length,
    diasFechados: dias.filter((d) => d.fechouInegociaveis).length,
    maxTreinosSemana: maxPorSemana(dias, "ineg-treino"),
    maxLeituraSemana: maxPorSemana(dias, "ineg-leitura"),
  };
}

export function conquistasDesbloqueadas(ctx: ConquistaContexto): string[] {
  return CONQUISTAS.filter((c) => c.condicao(ctx)).map((c) => c.id);
}
