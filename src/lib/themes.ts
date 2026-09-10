import { getTema, TEMAS } from "./plan-data";
import { PERFIL } from "./perfil";
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

// O tema padrão do perfil nasce livre, custe o que custar na tabela: é o tema
// que a config semeia na primeira abertura, e um tema aplicado que a tela de
// temas mostra como bloqueado é só uma contradição visível.
function livre(temaId: string): boolean {
  return temaId === PERFIL.temaPadrao;
}

// Temas que o XP atual desbloqueia.
export function temasDesbloqueados(xpTotal: number): ThemeDef[] {
  return TEMAS.filter((t) => livre(t.id) || xpTotal >= t.xpDesbloqueio);
}

export function temaDesbloqueado(temaId: string, xpTotal: number): boolean {
  return livre(temaId) || xpTotal >= getTema(temaId).xpDesbloqueio;
}
