"use client";

import { db } from "./db";
import { hojeChave } from "./dates";

const ID = "glb";

export async function temAvatar(): Promise<boolean> {
  return (await db.avatar.get(ID)) !== undefined;
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
