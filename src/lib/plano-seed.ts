"use client";

import { db, type Rotina } from "./db";

// Plano 4x/semana com ênfase em braços, peito e quadríceps (estética).
// Volume semanal aproximado por grupo, dentro da faixa de hipertrofia:
// Peito ~13 · Costas ~11 · Ombros ~8 (+ indireto) · Bíceps ~12 · Tríceps ~12 ·
// Quadríceps ~11 · Posteriores ~6 · Panturrilha ~4. Os ênfases batem o MAV.
const PLANO_4X: Rotina[] = [
  {
    id: "plano4x-a",
    nome: "A · Peito + Tríceps",
    exercicios: [
      { nome: "Supino (Barra)", series: 4 },
      { nome: "Supino Inclinado (Halter)", series: 3 },
      { nome: "Crucifixo na Polia (Máquina)", series: 3 },
      { nome: "Peito na Paralela do Graviton (Máquina)", series: 3 },
      { nome: "Tríceps na Polia", series: 3 },
      { nome: "Tríceps na Polia com Corda", series: 3 },
    ],
  },
  {
    id: "plano4x-b",
    nome: "B · Costas + Bíceps",
    exercicios: [
      { nome: "Puxada Alta na Polia (Máquina)", series: 4 },
      { nome: "Remadas Iso-Lateral (Máquina)", series: 4 },
      { nome: "Puxada Com Braços Esticados (Corda)", series: 3 },
      { nome: "Rosca Direta (Halter)", series: 3 },
      { nome: "Rosca Scott (Barra)", series: 3 },
      { nome: "Rosca Martelo (Halter)", series: 3 },
    ],
  },
  {
    id: "plano4x-c",
    nome: "C · Pernas (ênfase quadríceps)",
    exercicios: [
      { nome: "Agachamento (Barra)", series: 4 },
      { nome: "Leg Press 45º (Máquina)", series: 4 },
      { nome: "Cadeira Extensora (Máquina)", series: 3 },
      { nome: "Mesa Flexora (Máquina)", series: 3 },
      { nome: "Elevação de Panturrilha em Pé (Máquina)", series: 4 },
    ],
  },
  {
    id: "plano4x-d",
    nome: "D · Ombros + Braços + Peito",
    exercicios: [
      { nome: "Desenvolvimento (Halter)", series: 4 },
      { nome: "Elevação Lateral (Halter)", series: 4 },
      { nome: "Supino Inclinado (Halter)", series: 3 },
      { nome: "Rosca Direta (Máquina)", series: 3 },
      { nome: "Tríceps na Polia com Corda", series: 3 },
      { nome: "Crucifixo Baixo na Polia (Máquina)", series: 3 },
    ],
  },
];

// Instala o plano 4x na 1ª vez (idempotente — só insere as rotinas que faltam,
// pelos ids estáveis). Não mexe nas rotinas que o usuário já tem.
export async function seedPlano4xSeNecessario(): Promise<void> {
  try {
    const existentes = new Set((await db.rotinas.toArray()).map((r) => r.id));
    const faltam = PLANO_4X.filter((r) => !existentes.has(r.id));
    if (faltam.length) await db.rotinas.bulkPut(faltam);
  } catch {
    /* sem db disponível */
  }
}
