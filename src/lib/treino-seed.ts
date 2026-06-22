"use client";

import { db, type Treino, type Rotina } from "./db";

// Semeia o histórico de treino embutido (public/treino-seed.json) na 1ª vez
// (ou após reinstalar, quando o IndexedDB volta vazio). Não sobrescreve dados
// que o usuário já tenha registrado.
export async function seedTreinosSeNecessario(): Promise<void> {
  try {
    const n = await db.treinos.count();
    if (n > 0) return;
    const resp = await fetch("/treino-seed.json", { cache: "no-store" });
    if (!resp.ok) return;
    const data = (await resp.json()) as { treinos: Treino[]; rotinas: Rotina[] };
    if (data.treinos?.length) await db.treinos.bulkPut(data.treinos);
    if (data.rotinas?.length) await db.rotinas.bulkPut(data.rotinas);
  } catch {
    /* sem seed disponível */
  }
}
