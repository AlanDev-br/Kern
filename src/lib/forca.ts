import type { Treino } from "./db";
import type { Grupo } from "./musculacao";

// ─────────────────────────────────────────────────────────────
// Classificação de força por exercício (Bronze 3..1 → Diamante 3..1).
//
// É um modelo de REFERÊNCIA aproximado: para cada levantamento principal há um
// múltiplo do peso corporal que define cada nível, calibrado para homens e
// ajustado por sexo e idade. Serve para o usuário se situar (abaixo / na / acima
// da média de alguém com peso e idade parecidos) — não é uma medida clínica.
// ─────────────────────────────────────────────────────────────

export type LiftId = "supino" | "desenvolvimento" | "agachamento" | "terra" | "remada";

export interface PerfilFisico {
  sexo: "M" | "F";
  pesoCorporal: number; // kg
  idade: number; // anos
  altura?: number; // cm — referência do rank de tamanho
  medidas?: Record<string, number>; // circunferências (cm) por id de medida
}

const LIFTS: { id: LiftId; rotulo: string; chaves: string[] }[] = [
  // ordem importa: "terra" antes de costas/remada; específicos antes de genéricos
  { id: "terra", rotulo: "Levantamento terra", chaves: ["terra"] },
  { id: "agachamento", rotulo: "Agachamento", chaves: ["agachamento", "agacho"] },
  { id: "desenvolvimento", rotulo: "Desenvolvimento", chaves: ["desenvolvimento", "militar", "arnold", "ohp"] },
  { id: "supino", rotulo: "Supino", chaves: ["supino"] },
  { id: "remada", rotulo: "Remada", chaves: ["remada"] },
];

export const ROTULO_LIFT: Record<LiftId, string> = {
  terra: "Levantamento terra",
  agachamento: "Agachamento",
  desenvolvimento: "Desenvolvimento",
  supino: "Supino",
  remada: "Remada",
};

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Nome PT → levantamento canônico (ou null se não é um lift padrão classificável).
export function liftCanonico(nome: string): LiftId | null {
  const n = normalizar(nome);
  for (const l of LIFTS) {
    if (l.chaves.some((c) => n.includes(c))) return l.id;
  }
  return null;
}

// 1RM estimado (fórmula de Epley) a partir de uma série peso×reps.
export function estimar1RM(peso: number, reps: number): number {
  if (peso <= 0 || reps <= 0) return 0;
  if (reps === 1) return peso;
  return peso * (1 + reps / 30);
}

// Curva de 12 níveis (Bronze 3 → Diamante 1) como múltiplo do peso corporal,
// tomando o supino masculino como referência. Cada lift escala por um fator.
const CURVA = [0.5, 0.6, 0.75, 0.9, 1.0, 1.1, 1.25, 1.4, 1.5, 1.6, 1.75, 2.0];
const FATOR_LIFT: Record<LiftId, number> = {
  supino: 1.0,
  desenvolvimento: 0.62,
  agachamento: 1.35,
  terra: 1.6,
  remada: 0.9,
};

const TIERS = ["Bronze", "Prata", "Ouro", "Diamante"] as const;
export type Tier = (typeof TIERS)[number];
export const COR_TIER: Record<Tier, string> = {
  Bronze: "#b87333",
  Prata: "#9ca3af",
  Ouro: "#fbbf24",
  Diamante: "#38bdf8",
};

function fatorSexo(sexo: "M" | "F"): number {
  return sexo === "F" ? 0.65 : 1;
}

// Padrões caem um pouco com a idade (a "média de alguém da sua idade" levanta
// menos), tornando os níveis mais alcançáveis para quem é mais velho.
function fatorIdade(idade: number): number {
  if (!idade || idade <= 0) return 1;
  if (idade < 18) return 0.9;
  if (idade <= 30) return 1;
  return Math.max(0.75, 1 - (idade - 30) * 0.006);
}

export interface Classificacao {
  nivelIndex: number; // 0..11; -1 = iniciante (abaixo do Bronze 3)
  tier: Tier | "Iniciante";
  sub: number; // 3..1 (vazio quando iniciante)
  rotulo: string; // ex.: "Prata 2" ou "Iniciante"
  tierIndex: number; // 0..3; -1 iniciante
  cor: string;
  e1rm: number; // 1RM estimado atual (kg)
  alvoProximo: number | null; // kg para o próximo nível (null se no topo)
  progresso: number; // 0..1 rumo ao próximo nível
}

// Pesos (kg) que definem cada um dos 12 níveis para um dado lift e perfil.
function limiares(lift: LiftId, perfil: PerfilFisico): number[] {
  const k = FATOR_LIFT[lift] * fatorSexo(perfil.sexo) * fatorIdade(perfil.idade) * perfil.pesoCorporal;
  return CURVA.map((m) => m * k);
}

export function classificar(lift: LiftId, e1rm: number, perfil: PerfilFisico): Classificacao {
  const lim = limiares(lift, perfil);
  let idx = -1;
  for (let i = 0; i < lim.length; i++) if (e1rm >= lim[i]) idx = i;

  if (idx < 0) {
    // ainda abaixo do Bronze 3: progresso rumo ao primeiro nível
    const alvo = lim[0];
    return {
      nivelIndex: -1,
      tier: "Iniciante",
      sub: 0,
      rotulo: "Iniciante",
      tierIndex: -1,
      cor: "#6b7280",
      e1rm,
      alvoProximo: alvo,
      progresso: alvo > 0 ? Math.max(0, Math.min(1, e1rm / alvo)) : 0,
    };
  }

  const tierIndex = Math.floor(idx / 3);
  const sub = 3 - (idx % 3);
  const tier = TIERS[tierIndex];
  const base = lim[idx];
  const alvoProximo = idx + 1 < lim.length ? lim[idx + 1] : null;
  const progresso = alvoProximo ? Math.max(0, Math.min(1, (e1rm - base) / (alvoProximo - base))) : 1;

  return {
    nivelIndex: idx,
    tier,
    sub,
    rotulo: `${tier} ${sub}`,
    tierIndex,
    cor: COR_TIER[tier],
    e1rm,
    alvoProximo,
    progresso,
  };
}

// ── Nível genérico (usado por grupo/tamanho) ───────────────────────────────
export interface Nivel {
  index: number; // 0..11; -1 iniciante
  tier: Tier | "Iniciante";
  sub: number; // 3..1
  rotulo: string;
  tierIndex: number; // 0..3; -1
  cor: string;
}

export function nivelDoIndex(index: number): Nivel {
  if (index < 0)
    return { index: -1, tier: "Iniciante", sub: 0, rotulo: "Iniciante", tierIndex: -1, cor: "#6b7280" };
  const i = Math.min(11, Math.round(index));
  const tierIndex = Math.floor(i / 3);
  const sub = 3 - (i % 3);
  const tier = TIERS[tierIndex];
  return { index: i, tier, sub, rotulo: `${tier} ${sub}`, tierIndex, cor: COR_TIER[tier] };
}

// ── Rank de tamanho por medida corporal ────────────────────────────────────
// Referência de circunferência como fração da altura (homem médio ≈ nível
// central). É uma ESTIMATIVA para situar o usuário, não um padrão clínico.
export interface MedidaDef {
  id: string;
  rotulo: string;
  fracAltura: number; // circunferência de referência = fracAltura × altura
  grupos: Grupo[]; // grupos musculares que esta medida alimenta
}

export const MEDIDAS: MedidaDef[] = [
  { id: "braco", rotulo: "Braço", fracAltura: 0.185, grupos: ["Bíceps", "Tríceps"] },
  { id: "antebraco", rotulo: "Antebraço", fracAltura: 0.16, grupos: [] },
  { id: "ombros", rotulo: "Ombros", fracAltura: 0.66, grupos: ["Ombros"] },
  { id: "peito", rotulo: "Peito", fracAltura: 0.57, grupos: ["Peito"] },
  { id: "cintura", rotulo: "Cintura", fracAltura: 0.46, grupos: [] },
  { id: "quadril", rotulo: "Quadril", fracAltura: 0.55, grupos: ["Glúteos"] },
  { id: "coxa", rotulo: "Coxa", fracAltura: 0.32, grupos: ["Quadríceps", "Posteriores"] },
  { id: "panturrilha", rotulo: "Panturrilha", fracAltura: 0.21, grupos: ["Panturrilha"] },
];

const CURVA_MEDIDA = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.38];

function fatorSexoMedida(sexo: "M" | "F"): number {
  return sexo === "F" ? 0.9 : 1;
}

// Índice de nível (0..11, -1 abaixo) de uma medida contra a referência.
function indexMedida(def: MedidaDef, cm: number, perfil: PerfilFisico): number {
  const alt = perfil.altura ?? 0;
  if (!alt || !cm) return -1;
  const ref = def.fracAltura * alt * fatorSexoMedida(perfil.sexo);
  let idx = -1;
  for (let i = 0; i < CURVA_MEDIDA.length; i++) if (cm >= ref * CURVA_MEDIDA[i]) idx = i;
  return idx;
}

// ── Rank combinado por grupo muscular (carga + medida) ─────────────────────
export interface RankGrupo {
  grupo: Grupo;
  nivel: Nivel;
  temCarga: boolean;
  temMedida: boolean;
}

// Para cada grupo, mistura o índice de carga (do lift composto) com o de tamanho
// (da medida que o alimenta). Grupos sem lift usam só a medida; sem medida, só a
// carga. Mistura ponderada: 70% carga, 30% medida.
export function rankGrupos(treinos: Treino[], perfil: PerfilFisico): RankGrupo[] {
  const cargas = rankGruposPorCarga(treinos, perfil); // por grupo → Classificacao

  // índice de tamanho por grupo (melhor medida que o alimenta)
  const tamanhoPorGrupo = new Map<Grupo, number>();
  for (const def of MEDIDAS) {
    const cm = perfil.medidas?.[def.id];
    if (!cm) continue;
    const idx = indexMedida(def, cm, perfil);
    for (const g of def.grupos) {
      tamanhoPorGrupo.set(g, Math.max(tamanhoPorGrupo.get(g) ?? -1, idx));
    }
  }

  const grupos = new Set<Grupo>([
    ...(Object.keys(cargas) as Grupo[]),
    ...tamanhoPorGrupo.keys(),
  ]);

  const out: RankGrupo[] = [];
  for (const grupo of grupos) {
    const idxCarga = cargas[grupo]?.nivelIndex ?? -1;
    const idxTam = tamanhoPorGrupo.has(grupo) ? tamanhoPorGrupo.get(grupo)! : -1;
    const temCarga = grupo in cargas;
    const temMedida = tamanhoPorGrupo.has(grupo);

    let index: number;
    if (temCarga && temMedida) index = 0.7 * idxCarga + 0.3 * idxTam;
    else if (temCarga) index = idxCarga;
    else index = idxTam;

    out.push({ grupo, nivel: nivelDoIndex(index), temCarga, temMedida });
  }
  return out;
}

// Melhor 1RM estimado por lift, a partir de todo o histórico.
export function melhores1RM(treinos: Treino[]): Partial<Record<LiftId, number>> {
  const best: Partial<Record<LiftId, number>> = {};
  for (const t of treinos) {
    for (const ex of t.exercicios) {
      const lift = liftCanonico(ex.nome);
      if (!lift) continue;
      for (const s of ex.sets) {
        const e = estimar1RM(s.peso, s.reps);
        if (e > (best[lift] ?? 0)) best[lift] = e;
      }
    }
  }
  return best;
}

// ── Rank por grupo muscular ────────────────────────────────────────────────
// Cada grupo é classificado pelo levantamento composto que melhor o representa.
// Grupos sem lift composto padrão (bíceps, tríceps, panturrilha, core) ficam de
// fora aqui — serão classificados por medida corporal quando houver perfil com
// circunferências.
const GRUPO_LIFT: Partial<Record<Grupo, LiftId[]>> = {
  Peito: ["supino"],
  Costas: ["remada", "terra"],
  Ombros: ["desenvolvimento"],
  Quadríceps: ["agachamento"],
  Posteriores: ["terra"],
  Glúteos: ["agachamento", "terra"],
};

export function rankGruposPorCarga(
  treinos: Treino[],
  perfil: PerfilFisico,
): Partial<Record<Grupo, Classificacao>> {
  const best = melhores1RM(treinos);
  const out: Partial<Record<Grupo, Classificacao>> = {};
  for (const [grupo, lifts] of Object.entries(GRUPO_LIFT) as [Grupo, LiftId[]][]) {
    let topo = 0;
    let liftUsado: LiftId | null = null;
    for (const l of lifts) {
      if ((best[l] ?? 0) > topo) {
        topo = best[l]!;
        liftUsado = l;
      }
    }
    if (topo > 0 && liftUsado) out[grupo] = classificar(liftUsado, topo, perfil);
  }
  return out;
}

// ── Destreino: só o bloco de treino atual conta ────────────────────────────
// Após uma semana sem treinar, os recordes antigos deixam de valer — é preciso
// treinar de novo (e rebater os recordes) para reconquistar a classificação e o
// XP. O "bloco ativo" são as sessões consecutivas sem intervalo > 7 dias,
// terminando dentro da última semana. Se está destreinado, retorna vazio.
export const DETREINO_DIAS = 7;

export function blocoAtivo(treinos: Treino[]): Treino[] {
  if (treinos.length === 0) return [];
  const ord = [...treinos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ultima = new Date(ord[ord.length - 1].inicio).getTime();
  if ((Date.now() - ultima) / 86400000 > DETREINO_DIAS) return []; // destreinado agora

  const bloco: Treino[] = [ord[ord.length - 1]];
  for (let i = ord.length - 2; i >= 0; i--) {
    const gap = (new Date(bloco[0].inicio).getTime() - new Date(ord[i].inicio).getTime()) / 86400000;
    if (gap > DETREINO_DIAS) break;
    bloco.unshift(ord[i]);
  }
  return bloco;
}

// ── Recordes → XP ──────────────────────────────────────────────────────────
// Cada novo recorde de 1RM estimado por lift (dentro do bloco ativo) rende XP
// conforme o tier atingido.
const XP_POR_TIER = [12, 24, 40, 60]; // Bronze, Prata, Ouro, Diamante
const XP_PR_BASE = 10; // recorde ainda abaixo do Bronze 3 (ou sem perfil)

export function xpForca(treinos: Treino[], perfil?: PerfilFisico | null): number {
  const ativos = blocoAtivo(treinos); // destreino zera o XP retroativo
  const melhor: Partial<Record<LiftId, number>> = {};
  let xp = 0;
  for (const t of ativos) {
    for (const ex of t.exercicios) {
      const lift = liftCanonico(ex.nome);
      if (!lift) continue;
      let topo = 0;
      for (const s of ex.sets) topo = Math.max(topo, estimar1RM(s.peso, s.reps));
      if (topo > (melhor[lift] ?? 0)) {
        melhor[lift] = topo;
        if (perfil && perfil.pesoCorporal > 0) {
          const c = classificar(lift, topo, perfil);
          xp += c.tierIndex >= 0 ? XP_POR_TIER[c.tierIndex] : XP_PR_BASE;
        } else {
          xp += XP_PR_BASE;
        }
      }
    }
  }
  return xp;
}
