import type { Treino } from "./db";

// ─────────────────────────────────────────────────────────────
// Grupos musculares + mapeamento por nome de exercício (PT),
// volume semanal e coach de musculação natural (volume landmarks).
// ─────────────────────────────────────────────────────────────

export type Grupo =
  | "Peito"
  | "Costas"
  | "Ombros"
  | "Bíceps"
  | "Tríceps"
  | "Quadríceps"
  | "Posteriores"
  | "Glúteos"
  | "Panturrilha"
  | "Core"
  | "Outro";

export const GRUPOS: Grupo[] = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Quadríceps",
  "Posteriores",
  "Glúteos",
  "Panturrilha",
  "Core",
];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Regras por palavra-chave, em ordem (a primeira que casar vence).
// A ordem importa: ex. "terra romeno" precisa cair em Posteriores antes de Costas.
const REGRAS: { grupo: Grupo; chaves: string[] }[] = [
  // "adutora" cai em Glúteos por falta de grupo próprio: os adutores são
  // musculatura de quadril, e é ao lado da abdutora que o volume deles se lê.
  { grupo: "Glúteos", chaves: ["gluteo", "pelvica", "hip thrust", "coice", "curtsy", "afundo", "bulgaro", "abdutora", "abducao", "adutora", "extensao de quadril", "4 apoios", "quatro apoios"] },
  // "deadlift" antes de Costas de propósito: o terra em inglês aparece nas fichas
  // como sumô ou convencional, e nos dois a cadeia posterior é quem trabalha.
  { grupo: "Posteriores", chaves: ["romeno", "stiff", "flexora", "posterior", "femoral", "good morning", "deadlift"] },
  { grupo: "Panturrilha", chaves: ["panturrilha", "gemeos", "calf", "soleo"] },
  { grupo: "Quadríceps", chaves: ["agachamento", "leg press", "leg horizontal", "extensora", "hack", "passada", "lunge", "avanco"] },
  { grupo: "Peito", chaves: ["supino", "crucifixo", "voador", "peito", "paralela", "crossover", "fly", "flexao de braco"] },
  { grupo: "Costas", chaves: ["puxada", "remada", "remadas", "pulldown", "costas", "barra fixa", "pull up", "terra", "serrote"] },
  { grupo: "Ombros", chaves: ["desenvolvimento", "elevacao lateral", "ombro", "arnold", "militar", "elevacao frontal", "face pull", "encolhimento", "trapezio"] },
  { grupo: "Bíceps", chaves: ["rosca", "biceps", "scott", "martelo"] },
  { grupo: "Tríceps", chaves: ["triceps", "frances", "testa", "mergulho"] },
  { grupo: "Core", chaves: ["abdominal", "prancha", "core", "pallof", "dead bug", "hollow", "roda abdominal", "rocha oca", "farmer", "fazendeiro", "carry", "oblicuo", "abdomen", "infra", "supra", "crunch"] },
];

export function grupoDoExercicio(nome: string): Grupo {
  const n = normalizar(nome);
  for (const r of REGRAS) {
    if (r.chaves.some((c) => n.includes(c))) return r.grupo;
  }
  return "Outro";
}

// Retorna os músculos trabalhados pelo exercício e seus respectivos pesos (fator)
// 1.0 para primário, 0.5 para secundário/sinergista.
export function obterMusculosAlvo(nome: string): { grupo: Grupo; fator: number }[] {
  const primario = grupoDoExercicio(nome);
  if (primario === "Outro") return [];

  const targets: { grupo: Grupo; fator: number }[] = [{ grupo: primario, fator: 1.0 }];
  const n = normalizar(nome);

  if (primario === "Peito") {
    // Crucifixos e voadores isolam mais o peito. Outros (supino, crossover, paralela) usam tríceps e ombros.
    const isIsolador = n.includes("crucifixo") || n.includes("fly") || n.includes("voador");
    if (!isIsolador) {
      targets.push({ grupo: "Tríceps", fator: 0.5 });
      targets.push({ grupo: "Ombros", fator: 0.5 });
    } else {
      targets.push({ grupo: "Ombros", fator: 0.5 });
    }
  } else if (primario === "Costas") {
    // Terra recruta glúteos e posteriores
    if (n.includes("terra") && !n.includes("serrote")) {
      targets.push({ grupo: "Posteriores", fator: 0.5 });
      targets.push({ grupo: "Glúteos", fator: 0.5 });
    } else {
      // Puxadas e remadas usam bíceps e deltoide posterior
      targets.push({ grupo: "Bíceps", fator: 0.5 });
      targets.push({ grupo: "Ombros", fator: 0.5 });
    }
  } else if (primario === "Ombros") {
    // Desenvolvimentos recrutam tríceps
    if (n.includes("desenvolvimento") || n.includes("militar") || n.includes("arnold") || n.includes("press")) {
      targets.push({ grupo: "Tríceps", fator: 0.5 });
    } else if (n.includes("face pull") || n.includes("facepull")) {
      targets.push({ grupo: "Costas", fator: 0.5 });
    }
  } else if (primario === "Quadríceps") {
    // Extensora isola. Squats, leg press, afundo recrutam glúteos e posteriores.
    const isIsolador = n.includes("extensora") || n.includes("extensao");
    if (!isIsolador) {
      targets.push({ grupo: "Glúteos", fator: 0.5 });
      targets.push({ grupo: "Posteriores", fator: 0.5 });
    }
  } else if (primario === "Posteriores") {
    // Flexora isola. Romeno, stiff, good morning recrutam glúteos.
    const isIsolador = n.includes("flexora") || n.includes("flexao");
    if (!isIsolador) {
      targets.push({ grupo: "Glúteos", fator: 0.5 });
    }
  } else if (primario === "Glúteos") {
    // Afundo, búlgaro, passada recrutam quadríceps e posteriores.
    if (n.includes("afundo") || n.includes("bulgaro") || n.includes("passada") || n.includes("lunge") || n.includes("avanco")) {
      targets.push({ grupo: "Quadríceps", fator: 0.5 });
      targets.push({ grupo: "Posteriores", fator: 0.5 });
    } else if (n.includes("pelvica") || n.includes("hip thrust")) {
      targets.push({ grupo: "Posteriores", fator: 0.5 });
    }
  }

  return targets;
}

// Volume landmarks (séries/semana) para natural — referência RP (aprox.).
// [MEV mínimo eficaz, MAV adaptativo, MRV máximo recuperável]
export const LANDMARKS: Record<Grupo, [number, number, number]> = {
  Peito: [10, 16, 22],
  Costas: [10, 18, 25],
  Ombros: [8, 16, 22],
  Bíceps: [8, 14, 20],
  Tríceps: [8, 14, 18],
  Quadríceps: [8, 14, 20],
  Posteriores: [6, 12, 16],
  Glúteos: [4, 12, 16],
  Panturrilha: [8, 14, 20],
  Core: [0, 12, 25],
  Outro: [0, 0, 0],
};

// Séries de trabalho por grupo nos últimos `dias` dias (ponderando secundários).
export function volumeSemanal(treinos: Treino[], dias = 7): Record<Grupo, number> {
  const limite = Date.now() - dias * 86400000;
  const vol = Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>;
  vol.Outro = 0;
  for (const t of treinos) {
    if (new Date(t.inicio).getTime() < limite) continue;
    for (const ex of t.exercicios) {
      const alvos = obterMusculosAlvo(ex.nome);
      const series = ex.sets.filter((s) => s.tipo !== "warmup").length;
      for (const alvo of alvos) {
        vol[alvo.grupo] = (vol[alvo.grupo] ?? 0) + series * alvo.fator;
      }
    }
  }
  return vol;
}

export type StatusVolume = "baixo" | "ok" | "limite" | "excesso";

export interface AvaliacaoGrupo {
  grupo: Grupo;
  series: number;
  status: StatusVolume;
  mensagem: string;
}

export function avaliarVolume(vol: Record<Grupo, number>): AvaliacaoGrupo[] {
  return GRUPOS.map((grupo) => {
    const series = vol[grupo] ?? 0;
    const [mev, mav, mrv] = LANDMARKS[grupo];
    let status: StatusVolume;
    let mensagem: string;
    if (series < mev) {
      status = "baixo";
      mensagem = `Abaixo do mínimo pra crescer (${mev}+). Adicione séries.`;
    } else if (series <= mav) {
      status = "ok";
      mensagem = `Na faixa produtiva. Foque em progredir carga/reps.`;
    } else if (series <= mrv) {
      status = "limite";
      mensagem = `Perto do teto recuperável (${mrv}). Não suba mais sem necessidade.`;
    } else {
      status = "excesso";
      mensagem = `Acima do máximo recuperável (${mrv}). Como natural, isso vira junk volume e atrapalha — corte algumas séries.`;
    }
    return { grupo, series, status, mensagem };
  });
}

// Resumo do coach de treino para o coach geral / tela.
export function alertasTreino(treinos: Treino[]): AvaliacaoGrupo[] {
  const vol = volumeSemanal(treinos);
  return avaliarVolume(vol)
    .filter((a) => a.status === "excesso" || a.status === "baixo")
    .sort((a) => (a.status === "excesso" ? -1 : 1));
}

// Carga/reps máximos por exercício (pra progressão).
export function recordeExercicio(treinos: Treino[], nome: string): { peso: number; reps: number } | null {
  let best: { peso: number; reps: number } | null = null;
  for (const t of treinos) {
    for (const ex of t.exercicios) {
      if (ex.nome !== nome) continue;
      for (const s of ex.sets) {
        if (!best || s.peso > best.peso) best = { peso: s.peso, reps: s.reps };
      }
    }
  }
  return best;
}

// Lista de exercícios padrão comuns de musculação em português
export const EXERCICIOS_PADRAO = [
  // Peito
  "Supino Reto (Barra)",
  "Supino Reto (Halter)",
  "Supino Inclinado (Barra)",
  "Supino Inclinado (Halter)",
  "Supino Declinado (Barra)",
  "Crucifixo Reto (Halter)",
  "Crucifixo Inclinado (Halter)",
  "Peito na Paralela",
  "Crossover (Polia)",
  "Crucifixo no Voador (Máquina)",
  "Flexão de Braço",
  
  // Costas
  "Puxada Alta na Polia (Máquina)",
  "Puxada Alta (Pegada Supinada)",
  "Remada Curvada (Barra)",
  "Remada Baixa (Polia)",
  "Remada Serrote (Halter)",
  "Barra Fixa (Pull Up)",
  "Barra Fixa (Chin Up)",
  "Levantamento Terra (Barra)",
  "Remada Cavalinho",
  "Puxada Com Braços Esticados (Corda)",
  
  // Ombros
  "Desenvolvimento (Barra)",
  "Desenvolvimento (Halter)",
  "Elevação Lateral (Halter)",
  "Elevação Lateral (Polia)",
  "Elevação Frontal (Halter)",
  "Facepull (Polia)",
  "Crucifixo Invertido (Halter)",
  "Encolhimento (Halter)",
  "Encolhimento (Barra)",

  // Bíceps
  "Rosca Direta (Barra)",
  "Rosca Direta (Halter)",
  "Rosca Direta (Polia)",
  "Rosca Martelo (Halter)",
  "Rosca Martelo (Polia)",
  "Rosca Concentrada (Halter)",
  "Rosca Scott (Barra)",
  "Rosca Inversa (Barra)",
  
  // Tríceps
  "Tríceps na Polia (Corda)",
  "Tríceps na Polia (Barra)",
  "Tríceps Testa (Barra)",
  "Tríceps Francês (Halter)",
  "Mergulho no Banco",
  "Tríceps Coice (Halter)",
  
  // Quadríceps
  "Agachamento Livre (Barra)",
  "Agachamento Búlgaro (Halter)",
  "Leg Press 45º",
  "Cadeira Extensora (Máquina)",
  "Hack Squat (Máquina)",
  "Afundo (Halter)",
  "Passada (Halter)",
  
  // Posterior e Glúteos
  "Levantamento Terra Romeno (Barra)",
  "Levantamento Terra Romeno (Halter)",
  "Stiff (Barra)",
  "Cadeira Flexora (Máquina)",
  "Mesa Flexora (Máquina)",
  "Elevação Pélvica (Barra)",
  "Glúteo Coice (Polia)",
  
  // Panturrilha
  "Elevação de Panturrilha em Pé",
  "Elevação de Panturrilha Sentado",
  "Panturrilha no Leg Press",
  
  // Core
  "Abdominal Supra (Solo)",
  "Abdominal Remador",
  "Prancha Abdominal",
  "Abdominal Roda",
  "Elevação de Pernas (Suspenso)",
  "Press Pallof (Polia)"
];

// Catálogo de exercícios já usados (para autocompletar no registro).
export function catalogoExercicios(treinos: Treino[]): string[] {
  const set = new Set<string>(EXERCICIOS_PADRAO);
  for (const t of treinos) for (const ex of t.exercicios) set.add(ex.nome);
  return [...set].sort((a, b) => a.localeCompare(b, "pt"));
}
