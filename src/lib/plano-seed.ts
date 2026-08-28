"use client";

import { db, type Rotina } from "./db";

// Plano 4x/semana feminino com ênfase em pernas, glúteos, posteriores e cardio:
// SEGUNDA — Pernas + Glúteos
// TERÇA — Costas + Ombros + Braços + Cardio
// QUINTA — Glúteos + Posteriores
// SEXTA — Pernas Completas + Cardio
export const PLANO_FEMININO_4X: Rotina[] = [
  {
    id: "plano-fem-a",
    nome: "Segunda · Pernas + Glúteos",
    exercicios: [
      { nome: "Agachamento (Barra ou Smith)", series: 4 },
      { nome: "Cadeira Extensora (Máquina)", series: 3 },
      { nome: "Stiff (Halter ou Barra)", series: 3 },
      { nome: "Mesa Flexora (Máquina)", series: 3 },
      { nome: "Elevação Pélvica (Barra ou Máquina)", series: 4 },
      { nome: "Cadeira Abdutora (Máquina)", series: 3 },
      { nome: "Elevação de Panturrilha em Pé (Máquina)", series: 3 },
      { nome: "Abdominal na Prancha ou Máquina", series: 3 },
    ],
  },
  {
    id: "plano-fem-b",
    nome: "Terça · Costas + Ombros + Braços + Cardio",
    exercicios: [
      { nome: "Puxada Alta na Polia (Máquina)", series: 4 },
      { nome: "Remadas Iso-Lateral (Máquina)", series: 3 },
      { nome: "Desenvolvimento (Halter)", series: 3 },
      { nome: "Elevação Lateral (Halter)", series: 4 },
      { nome: "Rosca Direta (Halter)", series: 3 },
      { nome: "Tríceps na Polia com Corda", series: 3 },
    ],
  },
  {
    id: "plano-fem-c",
    nome: "Quinta · Glúteos + Posteriores",
    exercicios: [
      { nome: "Elevação Pélvica (Barra ou Máquina)", series: 4 },
      { nome: "Stiff (Halter ou Barra)", series: 4 },
      { nome: "Mesa Flexora (Máquina)", series: 3 },
      { nome: "Cadeira Flexora (Máquina)", series: 3 },
      { nome: "Afundo ou Passada (Halter)", series: 3 },
      { nome: "Cadeira Abdutora (Máquina)", series: 3 },
      { nome: "Extensão de Quadril na Polia", series: 3 },
      { nome: "Abdominal Infra no Chão ou Paralela", series: 3 },
    ],
  },
  {
    id: "plano-fem-d",
    nome: "Sexta · Pernas Completas + Cardio",
    exercicios: [
      { nome: "Leg Press 45º (Máquina)", series: 4 },
      { nome: "Agachamento (Barra ou Smith)", series: 3 },
      { nome: "Cadeira Extensora (Máquina)", series: 3 },
      { nome: "Mesa Flexora (Máquina)", series: 3 },
      { nome: "Glúteo na Polia (Extensão de Quadril)", series: 3 },
      { nome: "Cadeira Abdutora (Máquina)", series: 3 },
    ],
  },
];

// Plano clássico alternativo
export const PLANO_MASCULINO_4X: Rotina[] = [
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

// Instala as rotinas prioritárias do treino feminino
export async function seedPlano4xSeNecessario(): Promise<void> {
  try {
    const existentes = new Set((await db.rotinas.toArray()).map((r) => r.id));
    const todas = [...PLANO_FEMININO_4X, ...PLANO_MASCULINO_4X];
    const faltam = todas.filter((r) => !existentes.has(r.id));
    if (faltam.length) await db.rotinas.bulkPut(faltam);
  } catch {
    /* sem db disponível */
  }
}
