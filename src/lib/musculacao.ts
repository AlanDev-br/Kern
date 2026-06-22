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
  { grupo: "Glúteos", chaves: ["gluteo", "pelvica", "hip thrust", "coice", "curtsy", "afundo", "bulgaro"] },
  { grupo: "Posteriores", chaves: ["romeno", "stiff", "flexora", "posterior", "femoral", "good morning"] },
  { grupo: "Panturrilha", chaves: ["panturrilha", "gemeos", "calf", "soleo"] },
  { grupo: "Quadríceps", chaves: ["agachamento", "leg press", "extensora", "hack", "passada", "lunge", "avanco"] },
  { grupo: "Peito", chaves: ["supino", "crucifixo", "voador", "peito", "paralela", "crossover", "fly"] },
  { grupo: "Costas", chaves: ["puxada", "remada", "remadas", "pulldown", "costas", "barra fixa", "pull up", "terra", "serrote"] },
  { grupo: "Ombros", chaves: ["desenvolvimento", "elevacao lateral", "ombro", "arnold", "militar", "elevacao frontal", "face pull", "encolhimento", "trapezio"] },
  { grupo: "Bíceps", chaves: ["rosca", "biceps", "scott", "martelo"] },
  { grupo: "Tríceps", chaves: ["triceps", "frances", "testa", "mergulho"] },
  { grupo: "Core", chaves: ["abdominal", "prancha", "core", "pallof", "dead bug", "hollow", "roda abdominal", "rocha oca", "farmer", "fazendeiro", "carry", "oblicuo"] },
];

export function grupoDoExercicio(nome: string): Grupo {
  const n = normalizar(nome);
  for (const r of REGRAS) {
    if (r.chaves.some((c) => n.includes(c))) return r.grupo;
  }
  return "Outro";
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

// Séries de trabalho por grupo nos últimos `dias` dias.
export function volumeSemanal(treinos: Treino[], dias = 7): Record<Grupo, number> {
  const limite = Date.now() - dias * 86400000;
  const vol = Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<Grupo, number>;
  vol.Outro = 0;
  for (const t of treinos) {
    if (new Date(t.inicio).getTime() < limite) continue;
    for (const ex of t.exercicios) {
      const g = grupoDoExercicio(ex.nome);
      const series = ex.sets.filter((s) => s.tipo !== "warmup").length;
      vol[g] += series;
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

// Catálogo de exercícios já usados (para autocompletar no registro).
export function catalogoExercicios(treinos: Treino[]): string[] {
  const set = new Set<string>();
  for (const t of treinos) for (const ex of t.exercicios) set.add(ex.nome);
  return [...set].sort((a, b) => a.localeCompare(b, "pt"));
}
