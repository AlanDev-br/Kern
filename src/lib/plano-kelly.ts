import type { Rotina } from "./db";

// ─────────────────────────────────────────────────────────────
// Plano 5x/semana — cinco divisões prescritas pelo treinador
// ─────────────────────────────────────────────────────────────
// Os nomes dos exercícios e a ordem vêm da prescrição original, sem tradução
// nem substituição: é o que está escrito na ficha que ela abre na academia, e
// mudar o nome aqui a faria procurar um exercício que não existe na lista dela.
//
// Séries e repetições NÃO estavam na ficha (as telas vieram com os exercícios
// fechados). O que está aqui é um piso razoável — 4 séries nos compostos
// grandes, 3 nos isoladores e no core — e a repetição-alvo é só o valor que
// aparece pré-preenchido no primeiro registro. Tudo isso é editável dentro do
// app; na primeira semana ela corrige para o que o treinador passou e o app
// passa a herdar da sessão anterior.
//
// A distribuição de segunda a sexta entra no nome da rotina, e não numa agenda
// separada, porque é assim que as outras rotinas do app se identificam — a tela
// de treino lista rotinas, não dias.

export const PLANO_KELLY: Rotina[] = [
  {
    id: "kelly-peito-costas",
    nome: "Segunda · Peito + Costas",
    exercicios: [
      { nome: "Flexão de braços com apoio de joelhos", series: 3, reps: 12 },
      { nome: "Crucifixo no voador", series: 3, reps: 12 },
      { nome: "Barra fixa no graviton neutra", series: 4, reps: 10 },
      { nome: "Remada articulada cabo pronada", series: 4, reps: 10 },
      { nome: "Remada curvada no cross supinada", series: 3, reps: 12 },
      { nome: "Pulldown com barra", series: 3, reps: 12 },
      // Isometria: as "repetições" são segundos de prancha.
      { nome: "Prancha ventral isométrica", series: 3, reps: 30 },
    ],
  },
  {
    id: "kelly-quadriceps",
    nome: "Terça · Quadríceps",
    exercicios: [
      { nome: "Agachamento no squat machine articulado de anilha", series: 4, reps: 10 },
      { nome: "Leg press 45 pés afastados", series: 4, reps: 12 },
      { nome: "Cadeira extensora", series: 3, reps: 15 },
      { nome: "Agachamento sumô", series: 3, reps: 12 },
      { nome: "Cadeira adutora", series: 3, reps: 15 },
      { nome: "Panturrilha máquina", series: 3, reps: 15 },
    ],
  },
  {
    id: "kelly-ombro-biceps-triceps",
    nome: "Quarta · Ombro + Bíceps + Tríceps",
    exercicios: [
      { nome: "Desenvolvimento de ombros no multi pegada neutra", series: 4, reps: 10 },
      { nome: "Elevação frontal anilha", series: 3, reps: 12 },
      // Conjugado com o tríceps na máquina: as duas séries emendam sem descanso.
      { nome: "Bíceps na polia baixa barra reta (conjugado)", series: 3, reps: 12 },
      { nome: "Elevação lateral", series: 4, reps: 12 },
      { nome: "Tríceps máquina (conjugado)", series: 3, reps: 12 },
      { nome: "Abdominal remador", series: 3, reps: 15 },
    ],
  },
  {
    id: "kelly-posteriores",
    nome: "Quinta · Posteriores",
    exercicios: [
      { nome: "Mesa flexora", series: 4, reps: 12 },
      { nome: "Cadeira flexora", series: 3, reps: 12 },
      { nome: "Levantamento terra (deadlift)", series: 4, reps: 10 },
      { nome: "Cadeira adutora", series: 3, reps: 15 },
      { nome: "Extensora articulado de anilha unilateral", series: 3, reps: 12 },
      { nome: "Panturrilha em pé", series: 3, reps: 15 },
    ],
  },
  {
    id: "kelly-gluteos",
    nome: "Sexta · Glúteos",
    exercicios: [
      { nome: "Abdução de quadril cross over", series: 3, reps: 15 },
      { nome: "Glúteo joelho flexionado polia baixa", series: 3, reps: 15 },
      { nome: "Sumô deadlift", series: 4, reps: 10 },
      { nome: "Leg horizontal pés afastados", series: 4, reps: 12 },
      { nome: "Cadeira abdutora", series: 3, reps: 15 },
      { nome: "Panturrilha no leg horizontal", series: 3, reps: 15 },
    ],
  },
];
