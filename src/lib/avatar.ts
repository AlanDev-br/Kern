"use client";

import { db } from "./db";
import { hojeChave } from "./dates";

const ID = "glb";

// Avatar base embutido no app (public/). Serve de padrão quando o usuário ainda
// não subiu o seu — o motor de evolução gera as variações a partir dele.
export const AVATAR_PADRAO_URL = "/avatar/base.glb";

// ── Estágios do avatar (corpo evolui com o rank) ────────────────
// 4 estágios cobrem os 7 ranks: 0=magro (E,D) · 1=médio (C,B) ·
// 2=forte (A,S) · 3=monarca. O Alan pode subir um GLB por estágio;
// onde faltar, cai no estágio inferior disponível ou no GLB base.
export const NUM_ESTAGIOS = 4;
export const ROTULO_ESTAGIO = ["Magro (E–D)", "Médio (C–B)", "Forte (A–S)", "Monarca"];

function idEstagio(estagio: number): string {
  return `glb-e${estagio}`;
}

// rank 0..6 → estágio 0..3
export function rankParaEstagio(rankIndex: number): number {
  return Math.min(Math.floor(Math.max(rankIndex, 0) / 2), NUM_ESTAGIOS - 1);
}

export async function temAvatar(): Promise<boolean> {
  return (await db.avatar.get(ID)) !== undefined;
}

// Existe ao menos um modelo (base ou qualquer estágio)?
export async function temAlgumAvatar(): Promise<boolean> {
  if (await temAvatar()) return true;
  for (let e = 0; e < NUM_ESTAGIOS; e++) {
    if (await db.avatar.get(idEstagio(e))) return true;
  }
  return false;
}

// Quais estágios já têm modelo (para a UI de upload).
export async function estagiosPreenchidos(): Promise<boolean[]> {
  const out: boolean[] = [];
  for (let e = 0; e < NUM_ESTAGIOS; e++) {
    out.push((await db.avatar.get(idEstagio(e))) !== undefined);
  }
  return out;
}

export async function salvarEstagioDeArquivo(estagio: number, file: File): Promise<void> {
  const blob = file.slice(0, file.size, "model/gltf-binary");
  await db.avatar.put({ id: idEstagio(estagio), blob, criadoEm: hojeChave() });
}

export async function removerEstagio(estagio: number): Promise<void> {
  await db.avatar.delete(idEstagio(estagio));
}

// Resolve o melhor modelo para um rank: estágio do rank → estágio inferior
// disponível → GLB base. Devolve um object URL (lembre de revogar).
export async function carregarModeloParaRankObjectURL(rankIndex: number): Promise<string | null> {
  const alvo = rankParaEstagio(rankIndex);
  for (let e = alvo; e >= 0; e--) {
    const reg = await db.avatar.get(idEstagio(e));
    if (reg) return URL.createObjectURL(reg.blob);
  }
  const base = await db.avatar.get(ID);
  return base ? URL.createObjectURL(base.blob) : null;
}

// Baixa o GLB de uma URL (ex.: export do Avaturn) e guarda como Blob no IndexedDB.
export async function salvarAvatarDeUrl(url: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Falha ao baixar (HTTP ${resp.status})`);
  const blob = await resp.blob();
  if (blob.size < 1000) throw new Error("Arquivo inválido ou vazio");
  await db.avatar.put({ id: ID, blob, criadoEm: hojeChave() });
}

// Salva a partir de um arquivo .glb escolhido pelo usuário (sem depender de rede/CORS).
export async function salvarAvatarDeArquivo(file: File): Promise<void> {
  const blob = file.slice(0, file.size, "model/gltf-binary");
  await db.avatar.put({ id: ID, blob, criadoEm: hojeChave() });
}

// Object URL do GLB cacheado, para o three.js carregar. Lembre de revogar depois.
export async function carregarAvatarObjectURL(): Promise<string | null> {
  const reg = await db.avatar.get(ID);
  if (!reg) return null;
  return URL.createObjectURL(reg.blob);
}

export async function removerAvatar(): Promise<void> {
  await db.avatar.delete(ID);
}
