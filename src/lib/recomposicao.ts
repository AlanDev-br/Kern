// Cruzamento balança × pulseira: recomposição corporal.
//
// A balança sozinha diz que o peso caiu. A pulseira sozinha diz quantas calorias
// saíram. Nenhuma das duas responde a única pergunta que muda conduta: **o que saiu
// era gordura ou era massa magra?** Este módulo junta as duas para responder isso —
// e, quando não tem base para responder, diz que não tem, em vez de chutar.

import { derivar, type MedidaCorporal, type PerfilFisico } from "./composicao";
import type { DiaSaude } from "./saude-resumo";

/** Densidade energética dos tecidos, em kcal por kg. */
const KCAL_POR_KG_GORDURA = 7700;
// Massa magra é quase toda água: mobilizar 1 kg custa uma fração do que custa 1 kg de
// gordura. Usar 7700 para os dois — erro comum — transforma perda de água em déficit
// gigante que nunca existiu.
const KCAL_POR_KG_MAGRA = 1100;

export type Veredito =
  | "recomposicao"
  | "gordura-limpa"
  | "custo-magra"
  | "ganho-limpo"
  | "ganho-gordo"
  | "estavel"
  | "sem-dados";

export interface JanelaCorporal {
  data: string;
  pesoKg: number;
  massaGordaKg?: number;
  massaMagraKg?: number;
  comImpedancia: boolean;
  pesagens: number;
}

export interface Recomposicao {
  veredito: Veredito;
  diasCobertos: number;
  inicio?: JanelaCorporal;
  fim?: JanelaCorporal;

  deltaPesoKg?: number;
  deltaGorduraKg?: number;
  deltaMagraKg?: number;
  /** Fração da variação de peso que foi gordura, de 0 a 1. */
  fracaoGordura?: number;

  // Lado energético, da pulseira
  gastoMedioKcal?: number;
  diasComGasto?: number;
  balancoKcalDia?: number;
  ingestaoEstimadaKcal?: number;

  /**
   * A separação gordura × magra só vale quando as duas pontas têm impedância. Sem
   * ela, a gordura sai de uma equação de IMC, que move a massa magra junto com o
   * peso por construção — o resultado pareceria uma medição e seria uma tautologia.
   */
  separacaoConfiavel: boolean;
  avisos: string[];
}

/** Média das pesagens de uma janela, com a composição derivada de cada uma. */
function agregarJanela(
  medidas: MedidaCorporal[],
  perfil: PerfilFisico,
): JanelaCorporal | undefined {
  if (medidas.length === 0) return undefined;

  const pesos: number[] = [];
  const gordas: number[] = [];
  const magras: number[] = [];
  let comImpedancia = 0;

  for (const m of medidas) {
    pesos.push(m.pesoKg);
    const d = derivar(m, perfil);
    if (m.impedancia) {
      comImpedancia++;
      if (d.massaGordaKg !== undefined) gordas.push(d.massaGordaKg);
      if (d.massaMagraKg !== undefined) magras.push(d.massaMagraKg);
    }
  }

  const med = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : undefined);

  return {
    data: medidas[medidas.length - 1].data,
    pesoKg: med(pesos)!,
    massaGordaKg: med(gordas),
    massaMagraKg: med(magras),
    comImpedancia: comImpedancia > 0,
    pesagens: medidas.length,
  };
}

function classificar(
  deltaPeso: number,
  deltaGordura: number | undefined,
  deltaMagra: number | undefined,
): Veredito {
  // Meio quilo é menos que a oscilação normal de água entre duas semanas. Abaixo
  // disso não há tendência a declarar — há ruído.
  const parado = Math.abs(deltaPeso) < 0.5;

  if (deltaGordura === undefined || deltaMagra === undefined) {
    if (parado) return "estavel";
    return deltaPeso < 0 ? "gordura-limpa" : "ganho-gordo";
  }

  if (parado) {
    // Peso igual com gordura saindo e magra entrando é o cenário raro que todo mundo
    // persegue — e é invisível para quem só olha a balança.
    if (deltaGordura < -0.3 && deltaMagra > 0.3) return "recomposicao";
    return "estavel";
  }

  if (deltaPeso < 0) {
    return deltaMagra < -0.3 ? "custo-magra" : "gordura-limpa";
  }

  return deltaGordura > 0.3 ? "ganho-gordo" : "ganho-limpo";
}

export const TEXTO_VEREDITO: Record<Veredito, string> = {
  recomposicao: "Recomposição: gordura saindo e massa magra entrando com o peso parado.",
  "gordura-limpa": "Perda de peso preservando massa magra.",
  "custo-magra": "O peso caiu, mas parte veio de massa magra.",
  "ganho-limpo": "Ganho de peso sem ganho de gordura relevante.",
  "ganho-gordo": "Ganho de peso com aumento de gordura.",
  estavel: "Sem variação além do ruído normal de hidratação.",
  "sem-dados": "Pesagens insuficientes para comparar duas janelas.",
};

export interface OpcoesRecomposicao {
  /** Tamanho de cada janela comparada, em dias. */
  janelaDias?: number;
  /** Distância entre o centro das duas janelas, em dias. */
  intervaloDias?: number;
}

/**
 * Compara duas janelas de pesagem e explica a diferença com o gasto da pulseira.
 *
 * Janela, e não ponto: uma pesagem isolada carrega mais água que sinal. Duas janelas
 * de uma semana afastadas por três é o menor arranjo em que a diferença sobrevive ao
 * ruído do dia a dia.
 */
export function analisarRecomposicao(
  medidas: MedidaCorporal[],
  perfil: PerfilFisico,
  dias: DiaSaude[],
  op: OpcoesRecomposicao = {},
): Recomposicao {
  const janelaDias = op.janelaDias ?? 7;
  const intervaloDias = op.intervaloDias ?? 21;
  const avisos: string[] = [];

  const ordenadas = [...medidas].sort((a, b) => a.data.localeCompare(b.data));
  if (ordenadas.length < 2) {
    return { veredito: "sem-dados", diasCobertos: 0, separacaoConfiavel: false, avisos };
  }

  const ultimaData = new Date(`${ordenadas[ordenadas.length - 1].data}T00:00:00`);
  const emDias = (d: number) => {
    const x = new Date(ultimaData);
    x.setDate(x.getDate() - d);
    return x.toISOString().slice(0, 10);
  };

  const fimIni = emDias(janelaDias - 1);
  const iniFim = emDias(intervaloDias);
  const iniIni = emDias(intervaloDias + janelaDias - 1);

  const janelaFim = agregarJanela(
    ordenadas.filter((m) => m.data >= fimIni),
    perfil,
  );
  let janelaInicio = agregarJanela(
    ordenadas.filter((m) => m.data >= iniIni && m.data <= iniFim),
    perfil,
  );

  // Sem pesagem naquela janela específica, a comparação vira "a mais antiga que
  // existe" — mas o usuário precisa saber que o intervalo não é o pedido.
  if (!janelaInicio) {
    const antigas = ordenadas.filter((m) => m.data < fimIni);
    if (antigas.length > 0) {
      janelaInicio = agregarJanela(antigas.slice(0, Math.min(3, antigas.length)), perfil);
      avisos.push(
        "Sem pesagem na janela de comparação: usando as medidas mais antigas disponíveis.",
      );
    }
  }

  if (!janelaInicio || !janelaFim) {
    return { veredito: "sem-dados", diasCobertos: 0, separacaoConfiavel: false, avisos };
  }

  const diasCobertos = Math.max(
    1,
    Math.round(
      (new Date(`${janelaFim.data}T00:00:00`).getTime() -
        new Date(`${janelaInicio.data}T00:00:00`).getTime()) /
        86_400_000,
    ),
  );

  const separacaoConfiavel = janelaInicio.comImpedancia && janelaFim.comImpedancia;
  if (!separacaoConfiavel) {
    avisos.push(
      "Alguma das janelas não tem pesagem com impedância — a divisão entre gordura e " +
        "massa magra viraria conta de IMC, então fica omitida.",
    );
  }

  const deltaPesoKg = round2(janelaFim.pesoKg - janelaInicio.pesoKg);
  const deltaGorduraKg =
    separacaoConfiavel &&
    janelaFim.massaGordaKg !== undefined &&
    janelaInicio.massaGordaKg !== undefined
      ? round2(janelaFim.massaGordaKg - janelaInicio.massaGordaKg)
      : undefined;
  const deltaMagraKg =
    separacaoConfiavel &&
    janelaFim.massaMagraKg !== undefined &&
    janelaInicio.massaMagraKg !== undefined
      ? round2(janelaFim.massaMagraKg - janelaInicio.massaMagraKg)
      : undefined;

  const fracaoGordura =
    deltaGorduraKg !== undefined && Math.abs(deltaPesoKg) > 0.1
      ? round2(deltaGorduraKg / deltaPesoKg)
      : undefined;

  // ── Lado energético ──
  const inicioChave = janelaInicio.data;
  const fimChave = janelaFim.data;
  const noPeriodo = dias.filter((d) => d.data >= inicioChave && d.data <= fimChave);
  const comGasto = noPeriodo.filter((d) => typeof d.kcalTotal === "number");
  const gastoMedioKcal =
    comGasto.length > 0
      ? Math.round(comGasto.reduce((s, d) => s + (d.kcalTotal ?? 0), 0) / comGasto.length)
      : undefined;

  let balancoKcalDia: number | undefined;
  if (deltaGorduraKg !== undefined && deltaMagraKg !== undefined) {
    const energia = deltaGorduraKg * KCAL_POR_KG_GORDURA + deltaMagraKg * KCAL_POR_KG_MAGRA;
    balancoKcalDia = Math.round(energia / diasCobertos);
  }

  let ingestaoEstimadaKcal: number | undefined;
  if (gastoMedioKcal !== undefined && balancoKcalDia !== undefined) {
    ingestaoEstimadaKcal = gastoMedioKcal + balancoKcalDia;
  }

  // O gasto da pulseira cobrir pouco do intervalo torna a ingestão estimada uma
  // extrapolação — vale dizer, não esconder.
  if (gastoMedioKcal !== undefined && comGasto.length < diasCobertos * 0.5) {
    avisos.push(
      `A pulseira cobriu ${comGasto.length} de ${diasCobertos} dias: a ingestão estimada é extrapolação.`,
    );
  }

  return {
    veredito: classificar(deltaPesoKg, deltaGorduraKg, deltaMagraKg),
    diasCobertos,
    inicio: janelaInicio,
    fim: janelaFim,
    deltaPesoKg,
    deltaGorduraKg,
    deltaMagraKg,
    fracaoGordura,
    gastoMedioKcal,
    diasComGasto: comGasto.length,
    balancoKcalDia,
    ingestaoEstimadaKcal,
    separacaoConfiavel,
    avisos,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
