// Sistema de níveis baseado em XP acumulado.

export interface NivelInfo {
  nivel: number;
  nome: string;
  xpNivelAtual: number; // xp já acumulado dentro do nível atual
  xpProximoNivel: number; // xp necessário para subir de nível
  progresso: number; // 0..1 dentro do nível
  xpTotal: number;
}

const NOMES_NIVEL = [
  "Despertar", // 1
  "Primeiros passos",
  "Em movimento",
  "Constante",
  "Disciplinado",
  "Firme",
  "Inabalável",
  "Forjado",
  "Senhor de si",
  "Reconstruído",
];

// XP necessário para alcançar o nível n (curva suave crescente).
function xpAcumuladoParaNivel(n: number): number {
  // nível 1 começa em 0; cada nível custa 100 * nivel
  let total = 0;
  for (let i = 1; i < n; i++) total += 100 * i;
  return total;
}

export function nivelDoXp(xpTotal: number): NivelInfo {
  let nivel = 1;
  while (xpAcumuladoParaNivel(nivel + 1) <= xpTotal) nivel++;

  const base = xpAcumuladoParaNivel(nivel);
  const proximo = xpAcumuladoParaNivel(nivel + 1);
  const xpNivelAtual = xpTotal - base;
  const xpProximoNivel = proximo - base;

  const nome = NOMES_NIVEL[Math.min(nivel - 1, NOMES_NIVEL.length - 1)];

  return {
    nivel,
    nome,
    xpNivelAtual,
    xpProximoNivel,
    progresso: xpProximoNivel > 0 ? xpNivelAtual / xpProximoNivel : 1,
    xpTotal,
  };
}
