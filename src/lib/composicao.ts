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
  imc: number;
  gorduraPct?: number;
  massaGordaKg?: number;
  massaMagraKg?: number;
  aguaPct?: number;
  massaMuscularKg?: number;
  massaOsseaKg?: number;
  tmb: number; // taxa metabólica basal (kcal/dia)
  /** De onde saiu a estimativa de gordura — a tela mostra isso, para o número
   *  nunca aparecer como se fosse medição direta. */
  fonteGordura: "bia" | "antropometrica" | "informada";
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Gordura corporal por impedância.
 *
 * ATENÇÃO: a constante desta equação NÃO é a da Xiaomi — aquela é fechada e
 * reproduzi-la de memória seria inventar número. Usamos a massa livre de gordura
 * por bioimpedância no formato clássico (altura²/resistência), que é a base da
 * literatura de BIA. O resultado tende a divergir alguns pontos do app Zepp
 * Life; o que importa aqui é a TENDÊNCIA ser consistente, medida sempre do mesmo
 * jeito, e não bater com um app que também é estimativa.
 *
 * Para calibrar contra um exame real (DEXA/adipômetro), use `ajusteGorduraPP`
 * no perfil: um deslocamento fixo em pontos percentuais.
 */
function gorduraPorBia(m: MedidaCorporal, p: PerfilFisico): number | undefined {
  if (!m.impedancia || !p.altura) return undefined;
  const alturaCm = p.altura;
  const sexo = p.sexo === "M" ? 1 : 0;

  // Massa livre de gordura (kg). Índice de impedância = altura²/R.
  const indice = (alturaCm * alturaCm) / m.impedancia;
  const ffm =
    0.36 * indice + 0.162 * alturaCm + 0.289 * m.pesoKg - 0.134 * p.idade + 4.83 * sexo - 6.83;

  if (!Number.isFinite(ffm) || ffm <= 0 || ffm >= m.pesoKg) return undefined;
  return clamp(((m.pesoKg - ffm) / m.pesoKg) * 100, 3, 65);
}

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
  const alturaM = alturaCm / 100;
  const imc = m.pesoKg / (alturaM * alturaM);

  const porBia = gorduraPorBia(m, p);
  let gorduraPct = porBia ?? gorduraAntropometrica(imc, p);
  const fonteGordura: ComposicaoDerivada["fonteGordura"] = porBia ? "bia" : "antropometrica";

  // Calibração contra exame real, quando houver.
  if (p.ajusteGorduraPP) {
    gorduraPct = clamp(gorduraPct + p.ajusteGorduraPP, 3, 65);
  }

  const massaGordaKg = (m.pesoKg * gorduraPct) / 100;
  const massaMagraKg = m.pesoKg - massaGordaKg;

  // Água e massa óssea são proporções estáveis da massa magra — estimativas
  // grosseiras, exibidas como tal. Só fazem sentido quando houve impedância.
  const aguaPct = porBia ? clamp((massaMagraKg * 0.732 * 100) / m.pesoKg, 25, 75) : undefined;
  const massaOsseaKg = porBia ? Math.round(massaMagraKg * 0.042 * 10) / 10 : undefined;
  const massaMuscularKg =
    porBia && massaOsseaKg ? Math.round((massaMagraKg - massaOsseaKg) * 10) / 10 : undefined;

  return {
    imc: Math.round(imc * 10) / 10,
    gorduraPct: Math.round(gorduraPct * 10) / 10,
    massaGordaKg: Math.round(massaGordaKg * 10) / 10,
    massaMagraKg: Math.round(massaMagraKg * 10) / 10,
    aguaPct: aguaPct ? Math.round(aguaPct * 10) / 10 : undefined,
    massaMuscularKg,
    massaOsseaKg,
    tmb: porBia ? tmbKatch(massaMagraKg) : tmbMifflin(m.pesoKg, alturaCm, p.idade, p.sexo),
    fonteGordura,
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
