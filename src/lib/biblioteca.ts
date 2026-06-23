import type { CartaoLeitura } from "./db";
import { hojeChave, parseChave, chaveDia } from "./dates";

// Repetição espaçada simples (caixas de Leitner). Cada caixa define quantos dias
// até a próxima revisão. Acertou fácil → sobe duas caixas; acertou na medida →
// sobe uma; achou difícil → volta para a primeira. Quanto mais alta a caixa,
// mais espaçada a revisão — é assim que o conceito migra para a memória de longo
// prazo.
export const INTERVALOS = [1, 2, 4, 8, 16, 32]; // dias por caixa (índices 0..5)
export const CAIXA_MAX = INTERVALOS.length - 1;

export type NotaRevisao = "dificil" | "ok" | "facil";

// XP por evento de leitura — fonte de XP própria da Biblioteca, somada ao total.
export const XP_LEITURA = 10; // 1ª leitura de um conceito
export const XP_REVISAO = 15; // cada revisão concluída

function somarDias(chave: string, dias: number): string {
  const d = parseChave(chave);
  d.setDate(d.getDate() + dias);
  return chaveDia(d);
}

// Aplica uma nota de revisão ao cartão e devolve uma cópia reagendada. Mantém a
// função pura para facilitar teste e uso no store.
export function agendar(cartao: CartaoLeitura, nota: NotaRevisao): CartaoLeitura {
  const passo = nota === "facil" ? 2 : nota === "ok" ? 1 : -cartao.caixa;
  const caixa = Math.max(0, Math.min(CAIXA_MAX, cartao.caixa + passo));
  const hoje = hojeChave();
  return {
    ...cartao,
    lido: true,
    caixa,
    revisoes: cartao.revisoes + 1,
    ultimaRevisao: hoje,
    proximaRevisao: somarDias(hoje, INTERVALOS[caixa]),
  };
}

// Marca a 1ª leitura de um conceito: entra no ciclo de revisão a partir de hoje.
export function marcarLido(cartao: CartaoLeitura): CartaoLeitura {
  if (cartao.lido) return cartao;
  return {
    ...cartao,
    lido: true,
    caixa: 0,
    proximaRevisao: somarDias(hojeChave(), INTERVALOS[0]),
  };
}

// Cartões já lidos cuja revisão está vencida (ou para hoje).
export function cartoesDeHoje(cartoes: CartaoLeitura[]): CartaoLeitura[] {
  const hoje = hojeChave();
  return cartoes.filter((c) => c.lido && c.proximaRevisao <= hoje);
}

// Conceitos ainda não lidos — disponíveis para a primeira leitura.
export function cartoesNaoLidos(cartoes: CartaoLeitura[]): CartaoLeitura[] {
  return cartoes.filter((c) => !c.lido);
}

// XP determinístico acumulado pela Biblioteca: 1ª leitura + cada revisão feita.
export function xpBiblioteca(cartoes: CartaoLeitura[]): number {
  let xp = 0;
  for (const c of cartoes) {
    if (c.lido) xp += XP_LEITURA;
    xp += c.revisoes * XP_REVISAO;
  }
  return xp;
}

export function contagensBiblioteca(cartoes: CartaoLeitura[]): {
  conceitosLidos: number;
  revisoesTotais: number;
} {
  let conceitosLidos = 0;
  let revisoesTotais = 0;
  for (const c of cartoes) {
    if (c.lido) conceitosLidos++;
    revisoesTotais += c.revisoes;
  }
  return { conceitosLidos, revisoesTotais };
}
