import { getTema, TEMAS } from "./plan-data";
import type { ThemeDef } from "./types";

// Aplica o tema escolhido como CSS variables no documento.
export function aplicarTema(temaId: string): void {
  if (typeof document === "undefined") return;
  const t = getTema(temaId);
  const root = document.documentElement;
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-2", t.accent2);
  root.style.setProperty("--glow", t.glow);
  root.setAttribute("data-theme", t.id);
}

// Temas que o XP atual desbloqueia.
export function temasDesbloqueados(xpTotal: number): ThemeDef[] {
  return TEMAS.filter((t) => xpTotal >= t.xpDesbloqueio);
}

export function temaDesbloqueado(temaId: string, xpTotal: number): boolean {
  return xpTotal >= getTema(temaId).xpDesbloqueio;
}
