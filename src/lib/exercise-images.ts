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
  // ── ampliação da cobertura ──
  ["supino reto", ["bench", "press"]],
  ["supino declinado", ["decline", "bench", "press"]],
  ["crossover", ["cable", "crossover"]],
  ["mergulho", ["dip"]],
  ["barra fixa", ["pull", "up"]],
  ["pull up", ["pull", "up"]],
  ["pulldown", ["pulldown"]],
  ["remada curvada", ["bent", "over", "row"]],
  ["remada unilateral", ["dumbbell", "row"]],
  ["serrote", ["dumbbell", "row"]],
  ["encolhimento", ["shrug"]],
  ["trapezio", ["shrug"]],
  ["face pull", ["face", "pull"]],
  ["desenvolvimento militar", ["military", "press"]],
  ["desenvolvimento arnold", ["arnold", "press"]],
  ["arnold", ["arnold", "press"]],
  ["rosca direta", ["barbell", "curl"]],
  ["rosca concentrada", ["concentration", "curl"]],
  ["triceps corda", ["triceps", "pushdown"]],
  ["triceps pulley", ["triceps", "pushdown"]],
  ["triceps pushdown", ["triceps", "pushdown"]],
  ["coice", ["kickback"]],
  ["agachamento frontal", ["front", "squat"]],
  ["agachamento bulgaro", ["bulgarian", "split", "squat"]],
  ["bulgaro", ["bulgarian", "split", "squat"]],
  ["hack", ["hack", "squat"]],
  ["stiff", ["stiff", "leg", "deadlift"]],
  ["good morning", ["good", "morning"]],
  ["adutora", ["hip", "adduction"]],
  ["abdutora", ["hip", "abduction"]],
  ["gluteo", ["glute"]],
  ["hip thrust", ["hip", "thrust"]],
  ["panturrilha sentado", ["seated", "calf", "raise"]],
  ["gemeos", ["calf", "raise"]],
  ["abdominal infra", ["leg", "raise"]],
  ["prancha lateral", ["side", "plank"]],
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

// Melhor imagem automática a partir do nome do exercício. Exige confiança mínima
// (casar os tokens traduzidos) para não exibir imagem errada; entre empates,
// prefere o nome mais curto (mais canônico, ex.: "Barbell Bench Press").
export async function melhorImagem(nome: string): Promise<string | null> {
  try {
    const index = await carregarIndex();
    const tokens = tokensDe(nome);
    if (tokens.length === 0) return null;
    let best: { e: ExDataset; score: number; len: number } | null = null;
    for (const e of index) {
      if (!urlDe(e)) continue;
      const en = norm(e.name);
      let score = 0;
      for (const t of tokens) if (en.includes(t)) score++;
      if (score === 0) continue;
      const len = e.name.length;
      if (!best || score > best.score || (score === best.score && len < best.len)) {
        best = { e, score, len };
      }
    }
    // confiança: casar ao menos 2 tokens (ou todos, quando há só 1) e >=60% deles
    const minimo = Math.max(Math.min(2, tokens.length), Math.ceil(tokens.length * 0.6));
    if (best && best.score >= minimo) return urlDe(best.e);
    return null;
  } catch {
    return null;
  }
}

// Mapa nome→arquivo das imagens de domínio público já embutidas no app
// (public/ex-img/map.json). Carregado uma vez e cacheado; funciona offline.
let cacheEmbutidas: Record<string, string> | null = null;
async function imagemEmbutida(nome: string): Promise<string | null> {
  if (!cacheEmbutidas) {
    try {
      const resp = await fetch("/ex-img/map.json", { cache: "force-cache" });
      cacheEmbutidas = resp.ok ? await resp.json() : {};
    } catch {
      cacheEmbutidas = {};
    }
  }
  const mapa = cacheEmbutidas ?? {};
  return mapa[nome] ?? null;
}

// Imagem do exercício, em ordem de prioridade:
// 1) escolha manual do usuário; 2) imagem nativa embutida (offline); 3) auto-match
// online pelo nome. Sem nada confiável → null (mostra o grupo muscular).
export async function resolverImagem(nome: string): Promise<string | null> {
  const manual = await imagemSalva(nome);
  if (manual) return manual;
  const embutida = await imagemEmbutida(nome);
  if (embutida) return embutida;
  return melhorImagem(nome);
}

export async function definirImagem(nome: string, url: string): Promise<void> {
  await db.exImagens.put({ nome, url });
}

// Remove a escolha manual; volta a valer o auto-match pelo nome.
export async function removerImagem(nome: string): Promise<void> {
  await db.exImagens.delete(nome);
}

function lerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Tokens do nome do arquivo (tira extensão, id numérico final e separadores).
function tokensDoArquivo(nomeArquivo: string): string[] {
  const base = nomeArquivo
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]\d+$/, "")
    .replace(/[_-]+/g, " ");
  return norm(base)
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const EXT_IMAGEM = /\.(gif|webp|png|jpe?g|avif)$/i;

// Importação em lote: o usuário seleciona vários arquivos (ou uma pasta inteira)
// que ele mesmo baixou, e cada um é vinculado ao exercício do catálogo cujo nome
// melhor casa com o nome do arquivo. O casamento funciona tanto com nomes de
// arquivo em PT quanto em EN: para cada exercício do catálogo comparamos contra
// o nome normalizado (PT) E a tradução em inglês (tokensDe). Devolve quantos
// casaram e quais ficaram de fora.
export async function vincularImagensEmLote(
  arquivos: File[],
  catalogo: string[],
): Promise<{ vinculadas: number; total: number; naoCasadas: string[]; ignorados: number }> {
  // alvo = "<nome PT normalizado> <tokens EN traduzidos>"
  const cat = catalogo.map((nome) => ({
    nome,
    alvo: `${norm(nome)} ${tokensDe(nome).join(" ")}`,
  }));
  const naoCasadas: string[] = [];
  let vinculadas = 0;
  let ignorados = 0;

  const imagens = arquivos.filter((f) => EXT_IMAGEM.test(f.name));
  ignorados = arquivos.length - imagens.length;

  for (const file of imagens) {
    const toks = tokensDoArquivo(file.name);
    if (toks.length === 0) {
      naoCasadas.push(file.name);
      continue;
    }
    let melhor: string | null = null;
    let melhorScore = 0;
    for (const c of cat) {
      let s = 0;
      for (const t of toks) if (c.alvo.includes(t)) s++;
      if (s > melhorScore) {
        melhorScore = s;
        melhor = c.nome;
      }
    }
    const minimo = Math.max(1, Math.floor(toks.length / 2));
    if (melhor && melhorScore >= minimo) {
      await definirImagem(melhor, await lerComoDataUrl(file));
      vinculadas++;
    } else {
      naoCasadas.push(file.name);
    }
  }
  return { vinculadas, total: imagens.length, naoCasadas, ignorados };
}
