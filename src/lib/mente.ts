"use client";

import { db, type AvaliacaoMente, type ResultadoCognitivo } from "./db";

// ─────────────────────────────────────────────────────────────
// Módulo "Mente": medir inteligência em vários âmbitos.
// 1) Auto-avaliação das múltiplas inteligências (Gardner + emocional) — radar.
// 2) Mini-testes cognitivos fundamentados (memória de trabalho, velocidade,
//    atenção/inibição) — números objetivos e retomáveis.
// Honestidade: o radar é didático e subjetivo; os testes são mais embasados.
// ─────────────────────────────────────────────────────────────

export interface Inteligencia {
  id: string;
  nome: string;
  icone: string;
  // afirmação para auto-avaliação (concordância 1..5)
  afirmacao: string;
}

// Gardner (8) + Emocional (Goleman). 1 afirmação por dimensão (v1).
export const INTELIGENCIAS: Inteligencia[] = [
  { id: "linguistica", nome: "Linguística", icone: "📝", afirmacao: "Me expresso bem com palavras — escrevendo ou falando — e aprendo lendo." },
  { id: "logica", nome: "Lógico-matemática", icone: "🔢", afirmacao: "Gosto de raciocinar, achar padrões e resolver problemas passo a passo." },
  { id: "espacial", nome: "Espacial", icone: "🧭", afirmacao: "Visualizo objetos e espaços de cabeça e me oriento bem no mundo." },
  { id: "corporal", nome: "Corporal-cinestésica", icone: "🤸", afirmacao: "Aprendo fazendo e tenho boa coordenação e consciência do corpo." },
  { id: "musical", nome: "Musical", icone: "🎵", afirmacao: "Percebo ritmo, melodia e tom com facilidade; música me move." },
  { id: "interpessoal", nome: "Interpessoal", icone: "🤝", afirmacao: "Leio bem as pessoas e me relaciono/colaboro com facilidade." },
  { id: "intrapessoal", nome: "Intrapessoal", icone: "🪞", afirmacao: "Conheço minhas emoções e motivações e reflito sobre mim com honestidade." },
  { id: "naturalista", nome: "Naturalista", icone: "🌿", afirmacao: "Observo e classifico padrões da natureza e do ambiente ao redor." },
  { id: "emocional", nome: "Emocional", icone: "❤️", afirmacao: "Regulo minhas emoções e lido bem com as emoções dos outros sob pressão." },
];

// ── Auto-avaliação ──────────────────────────────────────────
// respostas: id da inteligência → 1..5. Converte para 0..100.
export function pontuarAvaliacao(respostas: Record<string, number>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const i of INTELIGENCIAS) {
    const r = respostas[i.id] ?? 3;
    scores[i.id] = Math.round(((r - 1) / 4) * 100);
  }
  return scores;
}

export async function salvarAvaliacao(scores: Record<string, number>): Promise<void> {
  await db.avaliacoesMente.add({ data: new Date().toISOString(), scores });
}

export async function ultimaAvaliacao(): Promise<AvaliacaoMente | null> {
  const todas = await db.avaliacoesMente.orderBy("data").reverse().toArray();
  return todas[0] ?? null;
}

// ── Mini-testes cognitivos: normalização para 0..100 ────────
// Faixas escolhidas a partir de valores típicos da literatura (aproximados).
export function scoreReacao(ms: number): number {
  // ~150ms (excelente) → 100 ; ~450ms (lento) → 0
  return clamp(Math.round(((450 - ms) / 300) * 100));
}
export function scoreDigitos(span: number): number {
  // span 3 → ~14 ; 7 (média adulta) → ~71 ; 9+ → 100
  return clamp(Math.round(((span - 2) / 7) * 100));
}
export function scoreStroop(acertosPorSeg: number): number {
  // 0.4/s → 0 ; 1.4/s → 100
  return clamp(Math.round(((acertosPorSeg - 0.4) / 1.0) * 100));
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export async function salvarTeste(
  tipo: ResultadoCognitivo["tipo"],
  valor: number,
  score: number,
): Promise<void> {
  await db.testesCognitivos.add({ data: new Date().toISOString(), tipo, valor, score });
}

// Melhor score recente de cada tipo (últimos 60 dias) — pra refletir capacidade atual.
export async function melhoresCognitivos(): Promise<Record<string, number>> {
  const limite = Date.now() - 60 * 86400000;
  const todos = await db.testesCognitivos.toArray();
  const out: Record<string, number> = {};
  for (const t of todos) {
    if (new Date(t.data).getTime() < limite) continue;
    if (t.score > (out[t.tipo] ?? -1)) out[t.tipo] = t.score;
  }
  return out;
}

// Score geral da Mente (0..100) que alimenta o atributo Inteligência: combina a
// média do radar (auto-avaliação) com a média dos mini-testes. Sem dados → 0.
export function scoreMente(
  avaliacao: AvaliacaoMente | null,
  cognitivos: Record<string, number>,
): number {
  const partes: number[] = [];
  if (avaliacao) {
    const vals = Object.values(avaliacao.scores);
    if (vals.length) partes.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const cogVals = Object.values(cognitivos);
  if (cogVals.length) partes.push(cogVals.reduce((a, b) => a + b, 0) / cogVals.length);
  if (!partes.length) return 0;
  return Math.round(partes.reduce((a, b) => a + b, 0) / partes.length);
}
