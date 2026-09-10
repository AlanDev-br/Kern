"use client";

import type { Treino } from "./db";
import type { PerfilFisico } from "./forca";
import type { MedidaCorporal } from "./composicao";
import { derivar, serieComMedia, calcularTendencia } from "./composicao";
import {
  GRUPOS,
  LANDMARKS,
  volumeSemanal,
  type Grupo,
} from "./musculacao";

// ─────────────────────────────────────────────────────────────
// Direção semanal de treino
// ─────────────────────────────────────────────────────────────
// O app já sabia o volume por grupo e já tinha os landmarks (MEV/MAV/MRV), mas
// entregava isso como rótulo solto — "Peito 6 séries (baixo)". Rótulo não é
// direção: não diz quanto falta, não diz se é um acidente da semana ou um
// padrão de um mês, e não conversa com a composição corporal.
//
// A ligação que faltava é essa última, e ela muda a resposta. O mesmo "peito
// abaixo do MEV" pede coisas opostas conforme a fase: em déficit, volume alto
// não constrói músculo, ele consome recuperação que já está escassa — a meta é
// SUSTENTAR o estímulo; em superávit, é a hora de empurrar rumo ao MAV.
//
// Por isso a fase é decidida primeiro, e o alvo de cada grupo sai dela.

export type Fase = "deficit" | "superavit" | "manutencao" | "indefinida";

export interface VolumeGrupo {
  grupo: Grupo;
  series: number; // séries efetivas na semana (secundários já ponderados)
  mev: number;
  mav: number;
  mrv: number;
  alvo: number; // para onde ir NESTA fase
  delta: number; // séries a somar (+) ou cortar (−) para chegar no alvo
  media4sem: number; // média das 4 semanas, para separar acidente de padrão
  cronico: boolean; // fora da faixa há semanas, não só nesta
}

export interface DirecaoTreino {
  fase: Fase;
  faseMotivo: string;
  gorduraPct?: number;
  cinturaAltura?: number;
  kgPorSemana?: number;
  volume: VolumeGrupo[];
  prioridades: string[]; // no máximo 3, já em ordem, já acionáveis
  seriesTotais: number;
  /** Bloco pronto para o prompt do coach. É onde a direção vira texto. */
  paraCoach: string;
}

// A cintura prediz risco melhor que o percentual de gordura porque mede a
// gordura visceral e não depende de estimativa elétrica. Acima de 0,5 da
// altura já indica excesso central.
const RAZAO_CINTURA_ALERTA = 0.5;

function decidirFase(
  gorduraPct: number | undefined,
  cinturaAltura: number | undefined,
  kgPorSemana: number | undefined,
  sexo: "M" | "F",
): { fase: Fase; motivo: string } {
  const tetoGordura = sexo === "M" ? 18 : 26;
  const pisoGordura = sexo === "M" ? 12 : 20;

  // A tendência de peso é o sinal mais direto do que o corpo está fazendo AGORA,
  // e ganha da estimativa de gordura, que varia com hidratação.
  if (kgPorSemana !== undefined && kgPorSemana <= -0.2) {
    return { fase: "deficit", motivo: `perdendo ${Math.abs(kgPorSemana).toFixed(1)} kg/semana` };
  }
  if (kgPorSemana !== undefined && kgPorSemana >= 0.2) {
    return { fase: "superavit", motivo: `ganhando ${kgPorSemana.toFixed(1)} kg/semana` };
  }

  // Peso estável: quem decide é a composição, e a cintura tem prioridade.
  if (cinturaAltura !== undefined && cinturaAltura > RAZAO_CINTURA_ALERTA) {
    return {
      fase: "deficit",
      motivo: `cintura em ${(cinturaAltura * 100).toFixed(0)}% da altura (acima de 50%)`,
    };
  }
  if (gorduraPct !== undefined && gorduraPct > tetoGordura) {
    return { fase: "deficit", motivo: `gordura estimada em ${gorduraPct.toFixed(0)}%` };
  }
  if (gorduraPct !== undefined && gorduraPct < pisoGordura) {
    return { fase: "superavit", motivo: `gordura estimada em ${gorduraPct.toFixed(0)}%, há espaço para construir` };
  }
  if (gorduraPct !== undefined || cinturaAltura !== undefined) {
    return { fase: "manutencao", motivo: "composição na faixa e peso estável" };
  }
  return { fase: "indefinida", motivo: "sem pesagem nem medida registrada" };
}

/** Onde o volume de um grupo deve ficar, dada a fase. */
function alvoDaFase(fase: Fase, [mev, mav, mrv]: [number, number, number]): number {
  switch (fase) {
    // Em déficit a recuperação é o recurso escasso: manter o estímulo mínimo
    // eficaz preserva músculo sem cobrar o que o corpo não tem para pagar.
    case "deficit":
      return Math.round((mev + mav) / 2);
    // Em superávit há com que recuperar: é a janela de empurrar rumo ao MAV.
    case "superavit":
      return mav;
    case "manutencao":
      return Math.round((mev + mav) / 2);
    default:
      return mev; // sem dado, a meta honesta é só não ficar abaixo do mínimo
  }
}

export function calcularDirecao(
  treinos: Treino[],
  perfil: PerfilFisico | null | undefined,
  medidas: MedidaCorporal[] = [],
): DirecaoTreino {
  // ── Composição ────────────────────────────────────────────
  let gorduraPct: number | undefined;
  let kgPorSemana: number | undefined;
  let cinturaAltura: number | undefined;

  if (perfil) {
    const ordenadas = [...medidas].sort((a, b) => a.data.localeCompare(b.data));
    const ultima = ordenadas[ordenadas.length - 1];
    if (ultima) {
      gorduraPct = derivar(ultima, perfil).gorduraPct;
      const t = calcularTendencia(serieComMedia(ordenadas, perfil));
      if (t.leitura !== "sem-dados") kgPorSemana = t.kgPorSemana;
    }
    if (gorduraPct === undefined) gorduraPct = perfil.gorduraPct;

    const cintura = perfil.medidas?.cintura;
    if (cintura && perfil.altura) cinturaAltura = cintura / perfil.altura;
  }

  const { fase, motivo } = decidirFase(
    gorduraPct,
    cinturaAltura,
    kgPorSemana,
    perfil?.sexo ?? "M",
  );

  // ── Volume: semana atual contra a média de 4 semanas ──────
  const semana = volumeSemanal(treinos, 7);
  const mes = volumeSemanal(treinos, 28);

  const volume: VolumeGrupo[] = GRUPOS.filter((g) => g !== "Outro").map((grupo) => {
    const marcos = LANDMARKS[grupo];
    const [mev, mav, mrv] = marcos;
    const series = Math.round(semana[grupo] ?? 0);
    const media4sem = Math.round(((mes[grupo] ?? 0) / 4) * 10) / 10;
    const alvo = alvoDaFase(fase, marcos);
    // Só chamamos de crônico o que está fora da faixa NA MÉDIA do mês: uma
    // semana ruim é acidente, quatro semanas ruins são o programa.
    const cronico = media4sem < mev || media4sem > mrv;
    return { grupo, series, mev, mav, mrv, alvo, delta: alvo - series, media4sem, cronico };
  });

  // ── Prioridades: no máximo três, e concretas ──────────────
  // Excesso vem antes de falta: séries a mais roubam a recuperação das que
  // faltam, então cortar destrava o resto e é de graça.
  const excesso = volume
    .filter((v) => v.series > v.mrv)
    .sort((a, b) => b.series - b.mrv - (a.series - a.mrv));
  const faltando = volume
    .filter((v) => v.series < v.mev)
    .sort((a, b) => (Number(b.cronico) - Number(a.cronico)) || b.delta - a.delta);

  const prioridades: string[] = [];
  for (const v of excesso.slice(0, 1)) {
    prioridades.push(
      `Corte ${v.series - v.mrv} série(s) de ${v.grupo}: ${v.series} passa do máximo recuperável (${v.mrv}), e o excedente cobra recuperação sem construir nada.`,
    );
  }
  for (const v of faltando.slice(0, 3 - prioridades.length)) {
    const quando = v.cronico ? " — e não é só esta semana, é a média do mês" : " nesta semana";
    prioridades.push(
      `Suba ${v.grupo} de ${v.series} para ${v.alvo} séries (+${v.alvo - v.series})${quando}. Mínimo eficaz é ${v.mev}.`,
    );
  }
  if (!prioridades.length) {
    const total = volume.reduce((s, v) => s + v.series, 0);
    prioridades.push(
      total === 0
        ? "Nenhuma série registrada na semana. A direção começa a existir depois do primeiro treino anotado."
        : "Todos os grupos estão dentro da faixa. A alavanca agora é progressão de carga e reps, não mais volume.",
    );
  }

  const seriesTotais = volume.reduce((s, v) => s + v.series, 0);

  // ── O bloco que vai para o coach ──────────────────────────
  // Com número, alvo e faixa, e não com rótulo: é o que permite ao modelo dar
  // uma direção em vez de inventar uma.
  const linhasVol = volume
    .filter((v) => v.series > 0 || v.mev > 0)
    .map((v) => {
      const sit = v.series < v.mev ? "abaixo" : v.series > v.mrv ? "acima" : "na faixa";
      return `  ${v.grupo}: ${v.series} séries (${sit}; MEV ${v.mev} / MAV ${v.mav} / MRV ${v.mrv}; alvo desta fase ${v.alvo}; média 4 sem ${v.media4sem})`;
    })
    .join("\n");

  const paraCoach = [
    `FASE: ${fase} (${motivo}).`,
    gorduraPct !== undefined ? `Gordura estimada: ${gorduraPct.toFixed(1)}%.` : null,
    cinturaAltura !== undefined
      ? `Razão cintura/altura: ${cinturaAltura.toFixed(2)} (acima de 0,50 indica excesso central).`
      : null,
    kgPorSemana !== undefined ? `Tendência de peso: ${kgPorSemana.toFixed(2)} kg/semana.` : null,
    `Volume total da semana: ${seriesTotais} séries efetivas.`,
    "VOLUME POR GRUPO:",
    linhasVol || "  nenhuma série na semana",
    "PRIORIDADES JÁ CALCULADAS (use-as, não invente outras):",
    ...prioridades.map((p) => `  - ${p}`),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fase,
    faseMotivo: motivo,
    gorduraPct,
    cinturaAltura,
    kgPorSemana,
    volume,
    prioridades,
    seriesTotais,
    paraCoach,
  };
}

export const ROTULO_FASE: Record<Fase, string> = {
  deficit: "Em déficit",
  superavit: "Em superávit",
  manutencao: "Em manutenção",
  indefinida: "Fase indefinida",
};
