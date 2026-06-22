import type { DiaRegistro, ConquistaContexto } from "./types";
import { parseChave, chaveDia } from "./dates";
import { FRASES_DIAGNOSTICO } from "./plan-data";

// ─────────────────────────────────────────────────────────────
// Coach adaptativo: lê o histórico e devolve direcionamentos
// priorizados — o foco do dia + a correção concreta.
// 100% determinístico e offline.
// ─────────────────────────────────────────────────────────────

export type Severidade = "critico" | "atencao" | "bom";

export interface Direcionamento {
  id: string;
  severidade: Severidade;
  icone: string;
  titulo: string; // o foco do dia
  acao: string; // o que fazer agora
  frase: string; // reforço do diagnóstico
}

const PESO: Record<Severidade, number> = { critico: 3, atencao: 2, bom: 1 };

// minutos desde 18:00 (trata a virada da meia-noite p/ horário de dormir)
function minutosNoite(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return (h * 60 + m - 18 * 60 + 1440) % 1440;
}

function minutosDia(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function desvioPadrao(vals: number[]): number {
  if (vals.length < 2) return 0;
  const med = vals.reduce((s, v) => s + v, 0) / vals.length;
  const varia = vals.reduce((s, v) => s + (v - med) ** 2, 0) / vals.length;
  return Math.sqrt(varia);
}

function frase(seed: number): string {
  return FRASES_DIAGNOSTICO[Math.abs(seed) % FRASES_DIAGNOSTICO.length];
}

export interface CoachInput {
  dias: DiaRegistro[];
  diaHoje: DiaRegistro;
  ctx: ConquistaContexto;
}

// "dormir tarde" = depois das 23:30 (330 min desde 18:00)
const LIMITE_TARDE = 330;

export function gerarDirecionamentos({ dias, diaHoje, ctx }: CoachInput): Direcionamento[] {
  const hoje = chaveDia(new Date());
  // dias passados (sem hoje), mais recentes primeiro
  const passados = dias
    .filter((d) => d.data < hoje)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  const ultimos7 = passados.slice(0, 7);

  const out: Direcionamento[] = [];

  // ── 1. Streak quebrado / em risco ──
  const ontem = passados[0];
  if (ontem && !ontem.fechouInegociaveis) {
    out.push({
      id: "streak",
      severidade: ctx.melhorStreak >= 3 ? "critico" : "atencao",
      icone: "🔥",
      titulo: ctx.melhorStreak >= 3 ? "Seu streak caiu — recomeça hoje" : "Fecha os 3 hoje",
      acao: "Garanta só os 3 inegociáveis: acordar + 45min sem celular, treinar, 25min de leitura.",
      frase: "Cada inegociável que você cumpre num dia ruim tira poder do mundo externo e devolve pra você.",
    });
  } else if (ctx.streakAtual >= 3) {
    out.push({
      id: "streak-bom",
      severidade: "bom",
      icone: "⚡",
      titulo: `${ctx.streakAtual} dias seguidos — segura o ritmo`,
      acao: "Você está construindo a prova. Repete os 3 inegociáveis hoje.",
      frase: "Não é técnica, é repetição. É isso que mata carência e ansiedade.",
    });
  }

  // ── 2. Dormir tarde (com escalonamento) ──
  const noites = ultimos7
    .map((d) => minutosNoite(d.dormirManual))
    .filter((v): v is number => v !== null);
  let tardeSeguidos = 0;
  for (const d of passados) {
    const mn = minutosNoite(d.dormirManual);
    if (mn !== null && mn > LIMITE_TARDE) tardeSeguidos++;
    else if (mn !== null) break; // quebra a sequência só quando há dado de noite no horário
  }
  if (tardeSeguidos >= 2) {
    out.push({
      id: "dormir-tarde",
      severidade: tardeSeguidos >= 3 ? "critico" : "atencao",
      icone: "🌙",
      titulo:
        tardeSeguidos >= 3
          ? `Dormir tarde virou padrão (${tardeSeguidos} dias)`
          : "Você está dormindo tarde",
      acao: "Hoje: telas off às 22:00 e na cama até as 23:00. Leitura no lugar do scroll.",
      frase: "Dormir bem reduz cortisol — sono é parte do plano, não um detalhe.",
    });
  }

  // ── 3. Sono irregular (variância dos horários) ──
  const acordares = ultimos7
    .map((d) => minutosDia(d.acordarManual))
    .filter((v): v is number => v !== null);
  const dpNoite = desvioPadrao(noites);
  const dpAcordar = desvioPadrao(acordares);
  if ((noites.length >= 4 && dpNoite > 75) || (acordares.length >= 4 && dpAcordar > 75)) {
    out.push({
      id: "irregular",
      severidade: "atencao",
      icone: "🎯",
      titulo: "Seu horário de sono está bagunçado",
      acao: "Fixe um horário de dormir e de acordar e repita todo dia — inclusive fim de semana.",
      frase: "Horário fixo regula sono, humor e ansiedade. É a âncora de tudo.",
    });
  }

  // ── 4. Treino abaixo da meta (4x/semana) ──
  const treinos7 = ultimos7.filter((d) => d.concluidas.includes("ineg-treino")).length;
  if (ultimos7.length >= 4 && treinos7 < 3) {
    out.push({
      id: "treino",
      severidade: "atencao",
      icone: "💪",
      titulo: `Poucos treinos (${treinos7} nos últimos 7 dias)`,
      acao: "Treino hoje é inegociável pra bater as 4x da semana. Em dia fraco, caminhe 30 min.",
      frase: "Maior redutor de ansiedade que existe sem remédio.",
    });
  }

  // ── 5. Leitura baixa ──
  const leitura7 = ultimos7.filter((d) => d.concluidas.includes("ineg-leitura")).length;
  if (ultimos7.length >= 4 && leitura7 < 3) {
    out.push({
      id: "leitura",
      severidade: "atencao",
      icone: "📖",
      titulo: "A leitura está sumindo",
      acao: "25 min hoje, no lugar do celular. Um livro por vez.",
      frase: "O desperdício é o scroll, não o livro.",
    });
  }

  // ── Fallback positivo ──
  if (out.length === 0) {
    out.push({
      id: "base",
      severidade: "bom",
      icone: "🌱",
      titulo: "Base firme — siga construindo",
      acao: "Cumpra os 3 inegociáveis e respeite a janela de rede. Consistência > intensidade.",
      frase: frase(ctx.diasFechados + new Date().getDate()),
    });
  }

  return out.sort((a, b) => PESO[b.severidade] - PESO[a.severidade]);
}

// O direcionamento nº1 do dia (para o card e a notificação).
export function direcionamentoPrincipal(input: CoachInput): Direcionamento {
  return gerarDirecionamentos(input)[0];
}
