"use client";

import { db } from "./db";
import { PERFIL } from "./perfil";

// Instala as rotinas do perfil compilado. Idempotente por id: só grava o que
// ainda não existe, para não ressuscitar uma rotina que a pessoa apagou nem
// desfazer as séries que ela ajustou.
export async function seedPlano4xSeNecessario(): Promise<void> {
  try {
    const existentes = new Set((await db.rotinas.toArray()).map((r) => r.id));
    const faltam = PERFIL.rotinas.filter((r) => !existentes.has(r.id));
    if (faltam.length) await db.rotinas.bulkPut(faltam);
  } catch {
    /* sem db disponível */
  }
}
