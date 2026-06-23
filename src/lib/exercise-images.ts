"use client";

import { db } from "./db";

// Fonte pública e gratuita (domínio público), sem chave de API.
const INDEX_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

interface ExDataset {
  name: string;
  images?: string[];
}

let cacheIndex: ExDataset[] | null = null;

function norm(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Traduz palavras-chave PT (nomes de academia) para tokens em inglês do dataset.
const TRAD: [string, string[]][] = [
  ["supino inclinado", ["incline", "bench", "press"]],
  ["supino", ["bench", "press"]],
  ["crucifixo", ["fly"]],
  ["voador", ["fly"]],
  ["paralela", ["dip"]],
  ["peito", ["chest"]],
  ["rosca scott", ["preacher", "curl"]],
  ["rosca martelo", ["hammer", "curl"]],
  ["rosca", ["curl"]],
  ["triceps", ["triceps"]],
  ["frances", ["triceps", "extension"]],
  ["testa", ["lying", "triceps"]],
  ["puxada", ["pulldown"]],
  ["remada", ["row"]],
  ["levantamento terra romeno", ["romanian", "deadlift"]],
  ["terra romeno", ["romanian", "deadlift"]],
  ["levantamento terra", ["deadlift"]],
  ["agachamento hack", ["hack", "squat"]],
  ["agachamento", ["squat"]],
  ["leg press", ["leg", "press"]],
  ["cadeira extensora", ["leg", "extension"]],
  ["extensora", ["leg", "extension"]],
  ["mesa flexora", ["lying", "leg", "curl"]],
  ["cadeira flexora", ["seated", "leg", "curl"]],
  ["flexora", ["leg", "curl"]],
  ["panturrilha", ["calf", "raise"]],
  ["desenvolvimento", ["shoulder", "press"]],
  ["elevacao lateral", ["lateral", "raise"]],
  ["elevacao frontal", ["front", "raise"]],
  ["elevacao pelvica", ["hip", "thrust"]],
  ["pelvica", ["hip", "thrust"]],
  ["abdominal", ["crunch"]],
  ["prancha", ["plank"]],
  ["afundo", ["lunge"]],
  ["lunge", ["lunge"]],
  ["farmer", ["farmers", "walk"]],
  ["fazendeiro", ["farmers", "walk"]],
];

function tokensDe(nome: string): string[] {
  const n = norm(nome);
  for (const [pt, en] of TRAD) {
    if (n.includes(pt)) return en;
  }
  return n.split(/\s+/).filter((w) => w.length > 3);
}

async function carregarIndex(): Promise<ExDataset[]> {
  if (cacheIndex) return cacheIndex;
  const local = typeof localStorage !== "undefined" ? localStorage.getItem("exdb_index") : null;
  if (local) {
    try {
      cacheIndex = JSON.parse(local);
      return cacheIndex!;
    } catch {
      /* refaz fetch */
    }
  }
  const resp = await fetch(INDEX_URL);
  const data = (await resp.json()) as ExDataset[];
  cacheIndex = data.map((e) => ({ name: e.name, images: e.images }));
  try {
    localStorage.setItem("exdb_index", JSON.stringify(cacheIndex));
  } catch {
    /* cota cheia, segue sem cache local */
  }
  return cacheIndex!;
}

function urlDe(e: ExDataset): string | null {
  return e.images && e.images.length ? IMG_BASE + e.images[0] : null;
}

// Top correspondências para o seletor manual.
export async function buscarImagens(nome: string, limite = 6): Promise<{ nome: string; url: string }[]> {
  try {
    const index = await carregarIndex();
    const tokens = tokensDe(nome);
    const ranqueado = index
      .map((e) => {
        const en = norm(e.name);
        const score = tokens.reduce((s, t) => s + (en.includes(t) ? 1 : 0), 0);
        return { e, score };
      })
      .filter((x) => x.score > 0 && urlDe(x.e))
      .sort((a, b) => b.score - a.score)
      .slice(0, limite);
    return ranqueado.map((x) => ({ nome: x.e.name, url: urlDe(x.e)! }));
  } catch {
    return [];
  }
}

// URL já definida/cacheada para o exercício (ou null).
export async function imagemSalva(nome: string): Promise<string | null> {
  const reg = await db.exImagens.get(nome);
  return reg?.url ?? null;
}

// Resolve a melhor imagem: usa a salva, senão a primeira sugestão (e cacheia).
export async function resolverImagem(nome: string): Promise<string | null> {
  const salva = await imagemSalva(nome);
  if (salva) return salva;
  const sugestoes = await buscarImagens(nome, 1);
  if (sugestoes.length) {
    await db.exImagens.put({ nome, url: sugestoes[0].url });
    return sugestoes[0].url;
  }
  return null;
}

export async function definirImagem(nome: string, url: string): Promise<void> {
  await db.exImagens.put({ nome, url });
}
