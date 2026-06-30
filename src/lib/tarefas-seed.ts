"use client";

import { db, type TarefaReg } from "./db";
import { INEGOCIAVEIS, BLOCOS } from "./plan-data";

// Semeia o checklist diário na 1ª vez a partir do plano padrão (3 inegociáveis +
// blocos). A ordem segue inegociáveis primeiro, depois blocos — a mesma da home
// antiga. Idempotente: só roda quando a tabela está vazia, para não ressuscitar
// tarefas que o usuário removeu de propósito.
export async function seedTarefasSeNecessario(): Promise<void> {
  try {
    const total = await db.tarefas.count();
    if (total > 0) return;
    const base = [...INEGOCIAVEIS, ...BLOCOS];
    const registros: TarefaReg[] = base.map((t, i) => ({ ...t, ordem: i }));
    await db.tarefas.bulkPut(registros);
  } catch {
    /* sem db disponível */
  }
}
