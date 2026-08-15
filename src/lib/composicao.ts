// Composição corporal a partir da balança (Xiaomi Mi Body Composition Scale 2)
// ou de entrada manual.
//
// PONTO CENTRAL DO DESENHO: a balança não calcula composição corporal. Ela
// transmite apenas PESO e IMPEDÂNCIA bioelétrica (ohms). Gordura, músculo, água
// e companhia são derivados — no app da Xiaomi, por fórmula proprietária.
//
// Por isso guardamos sempre o BRUTO (peso + impedância) e derivamos por função
// pura. Se a fórmula melhorar, o histórico inteiro é recalculado sem perder
// nada. Guardar só o número derivado seria uma via de mão única.

import type { AppConfig } from "./types";
// IMC tem uma única fonte no app (`forca.ts`, que já devolve faixa e cor para a
// interface). Aqui ele é insumo de cálculo, não uma segunda definição.
import { imc as imcInfo } from "./forca";
import { calcular as calcularXiaomi } from "./composicao-xiaomi";

export type PerfilFisico = NonNullable<AppConfig["perfil"]>;

/** Medida bruta: o que a balança realmente entrega, mais o contexto da pesagem. */
export interface MedidaCorporal {
  id: string; // ISO do instante da pesagem (único por medição)
  data: string; // "YYYY-MM-DD" — dia da pesagem, para juntar com o resto do app
  pesoKg: number;
  /** Impedância em ohms. Ausente quando a pesagem foi só de peso (pé calçado,
   *  entrada manual, ou leitura sem contato dos eletrodos). */
  impedancia?: number;
  origem: "balanca" | "health_connect" | "manual";
  /** BIA só é comparável em condição padronizada: manhã, jejum, após o banheiro,
   *  descalço. Fora disso a medida continua válida como peso, mas a derivação
   *  vira estimativa grosseira — marcamos em vez de descartar. */
  padronizada?: boolean;
  nota?: string;
}

/** Métricas derivadas. Nenhuma delas é gravada: são calculadas sob demanda. */
export interface ComposicaoDerivada {
  gorduraPct?: number;
  massaGordaKg?: number;
  massaMagraKg?: number;
  aguaPct?: number;
  proteinaPct?: number;
  massaMuscularKg?: number;
  massaOsseaKg?: number;
  gorduraVisceral?: number; // índice: até 9 normal, 10-14 atenção, 15+ alto
  idadeMetabolica?: number;
  tmb: number; // taxa metabólica basal (kcal/dia)
  /** De onde saiu a estimativa de gordura — a tela mostra isso, para o número
   *  nunca aparecer como se fosse medição direta. */
  fonteGordura: "bia" | "antropometrica" | "informada";
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Gordura sem impedância (Deurenberg, 1991) — depende só de IMC, idade e sexo.
 * É o piso: funciona em qualquer pesagem, inclusive de pé calçado, e é o que
 * permite a tela existir antes de a leitura BLE estar pronta.
 */
function gorduraAntropometrica(imc: number, p: PerfilFisico): number {
  const sexo = p.sexo === "M" ? 1 : 0;
  return clamp(1.2 * imc + 0.23 * p.idade - 10.8 * sexo - 5.4, 3, 65);
}

/** Mifflin-St Jeor — padrão para gasto basal quando não há massa magra confiável. */
function tmbMifflin(pesoKg: number, alturaCm: number, idade: number, sexo: "M" | "F"): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade;
  return Math.round(sexo === "M" ? base + 5 : base - 161);
}

/** Katch-McArdle — mais fiel quando a massa magra é conhecida. */
function tmbKatch(massaMagraKg: number): number {
  return Math.round(370 + 21.6 * massaMagraKg);
}

export function derivar(m: MedidaCorporal, p: PerfilFisico): ComposicaoDerivada {
  const alturaCm = p.altura ?? 175;
  const imcValor = imcInfo(m.pesoKg, alturaCm)?.valor ?? 0;

  // Com impedância, vale a cadeia calibrada para a balança: é ela que faz os
  // números conversarem com o aparelho, em vez de cada métrica sair de uma
  // equação genérica diferente.
  if (m.impedancia && p.altura) {
    const x = calcularXiaomi({
      pesoKg: m.pesoKg,
      impedancia: m.impedancia,
      alturaCm: p.altura,
      idade: p.idade,
      sexo: p.sexo,
    });
    const ajuste = p.ajusteGorduraPP ?? 0;
    const gorduraPct = ajuste ? clamp(x.gorduraPct + ajuste, 3, 65) : x.gorduraPct;
    return {
      gorduraPct: Math.round(gorduraPct * 10) / 10,
      massaGordaKg: x.massaGordaKg,
      massaMagraKg: x.massaMagraKg,
      aguaPct: x.aguaPct,
      proteinaPct: x.proteinaPct,
      massaMuscularKg: x.massaMuscularKg,
      massaOsseaKg: x.massaOsseaKg,
      gorduraVisceral: x.gorduraVisceral,
      idadeMetabolica: x.idadeMetabolica,
      tmb: x.tmb,
      fonteGordura: "bia",
    };
  }

  // Sem impedância (pesagem de meia, chinelo, ou entrada manual) sobra o que dá
  // para estimar de peso e altura. Aqui só peso, gordura e gasto basal fazem
  // sentido — água, proteína, osso e visceral dependem da corrente atravessando
  // o corpo, e preencher esses campos com conta de IMC seria fingir medição.
  let gorduraPct = gorduraAntropometrica(imcValor, p);
  if (p.ajusteGorduraPP) {
    gorduraPct = clamp(gorduraPct + p.ajusteGorduraPP, 3, 65);
  }

  const massaGordaKg = (m.pesoKg * gorduraPct) / 100;
  const massaMagraKg = m.pesoKg - massaGordaKg;

  return {
    gorduraPct: Math.round(gorduraPct * 10) / 10,
    massaGordaKg: Math.round(massaGordaKg * 10) / 10,
    massaMagraKg: Math.round(massaMagraKg * 10) / 10,
    tmb: tmbMifflin(m.pesoKg, alturaCm, p.idade, p.sexo),
    fonteGordura: "antropometrica",
  };
}

// ── Tendência ────────────────────────────────────────────────────────────────
//
// Peso de um dia é ruído: água, sal, horário e intestino mexem mais que gordura.
// Por isso a tela lidera com média móvel e variação por semana, nunca com o
// valor cru — quem decide dieta olhando o número do dia decide errado.

export interface PontoTendencia {
  data: string;
  pesoKg: number;
  media7: number;
  gorduraPct?: number;
}

/** Média móvel de 7 dias, alinhada à direita (usa o dia e os 6 anteriores). */
export function serieComMedia(medidas: MedidaCorporal[], p: PerfilFisico): PontoTendencia[] {
  const ordenadas = [...medidas].sort((a, b) => a.data.localeCompare(b.data));
  return ordenadas.map((m, i) => {
    const janela = ordenadas.slice(Math.max(0, i - 6), i + 1);
    const media = janela.reduce((s, x) => s + x.pesoKg, 0) / janela.length;
    return {
      data: m.data,
      pesoKg: m.pesoKg,
      media7: Math.round(media * 10) / 10,
      gorduraPct: derivar(m, p).gorduraPct,
    };
  });
}

export interface Tendencia {
  /** Variação da média móvel em kg por semana. Negativo = perdendo peso. */
  kgPorSemana: number;
  /** Rótulo honesto do que está acontecendo, já considerando a margem de ruído. */
  leitura: "perdendo" | "ganhando" | "estavel" | "sem-dados";
  amostras: number;
}

/**
 * Compara a média móvel atual com a de 7 dias atrás. Abaixo de 0,2 kg/semana
 * chamamos de estável: é menos que a variação normal de hidratação, e afirmar
 * tendência aí seria ler ruído como sinal.
 */
export function calcularTendencia(serie: PontoTendencia[]): Tendencia {
  if (serie.length < 4) return { kgPorSemana: 0, leitura: "sem-dados", amostras: serie.length };

  const ultimo = serie[serie.length - 1];
  const alvo = new Date(`${ultimo.data}T00:00:00`);
  alvo.setDate(alvo.getDate() - 7);
  const chaveAlvo = alvo.toISOString().slice(0, 10);

  // O ponto mais próximo de 7 dias atrás — pesagens não são diárias.
  let anterior = serie[0];
  for (const p of serie) {
    if (p.data <= chaveAlvo) anterior = p;
    else break;
  }

  const dias = Math.max(
    1,
    (new Date(`${ultimo.data}T00:00:00`).getTime() -
      new Date(`${anterior.data}T00:00:00`).getTime()) /
      86_400_000,
  );
  const kgPorSemana = Math.round((((ultimo.media7 - anterior.media7) / dias) * 7) * 100) / 100;

  const leitura =
    Math.abs(kgPorSemana) < 0.2 ? "estavel" : kgPorSemana < 0 ? "perdendo" : "ganhando";
  return { kgPorSemana, leitura, amostras: serie.length };
}
