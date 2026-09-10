"use client";

import { db, type Treino, type Rotina } from "./db";
import { PERFIL } from "./perfil";

// Semeia o histórico de treino embutido (public/treino-seed.json) na 1ª vez
// (ou após reinstalar, quando o IndexedDB volta vazio). Não sobrescreve dados
// que o usuário já tenha registrado.
export async function seedTreinosSeNecessario(): Promise<void> {
  try {
    // O arquivo semeado é o histórico real de uma pessoa. Num build de outro
    // perfil ele não é omitido por delicadeza: os treinos dela apareceriam como
    // se fossem dela, e todo gráfico, volume e classificação de força nasceria
    // mentindo.
    if (!PERFIL.semearHistorico) return;
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
