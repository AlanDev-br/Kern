// Ranks no estilo Solo Leveling — o avatar "sobe de rank" conforme o nível,
// transformando a prova acumulada em poder visível (de perdedor a vencedor).

export interface RankInfo {
  id: string;
  nome: string;
  cor: string; // cor da aura/efeitos
  glow: string; // rgb p/ brilhos
  lema: string; // reforço psicológico
}

const RANKS: RankInfo[] = [
  { id: "E", nome: "Rank E", cor: "#8a90a2", glow: "138,144,162", lema: "Todo monarca começou fraco. Hoje é o primeiro passo." },
  { id: "D", nome: "Rank D", cor: "#22c55e", glow: "34,197,94", lema: "Você já não é quem era ontem." },
  { id: "C", nome: "Rank C", cor: "#38bdf8", glow: "56,189,248", lema: "Os outros começam a notar a sua mudança." },
  { id: "B", nome: "Rank B", cor: "#3b82f6", glow: "59,130,246", lema: "A disciplina virou a sua arma." },
  { id: "A", nome: "Rank A", cor: "#a78bfa", glow: "167,139,250", lema: "Poucos chegam até aqui. Você é um deles." },
  { id: "S", nome: "Rank S", cor: "#fbbf24", glow: "251,191,36", lema: "De quem duvidavam a quem admiram." },
  { id: "MONARCA", nome: "Monarca", cor: "#a855f7", glow: "168,85,247", lema: "Você se tornou inevitável." },
];

// nivel 1→E, 2→D, ... 6→S, 7+→Monarca
export function rankDoNivel(nivel: number): RankInfo {
  return RANKS[Math.min(Math.max(nivel - 1, 0), RANKS.length - 1)];
}

export function proximoRank(nivel: number): RankInfo | null {
  const i = Math.min(Math.max(nivel - 1, 0), RANKS.length - 1);
  return i < RANKS.length - 1 ? RANKS[i + 1] : null;
}
