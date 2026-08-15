/*
 * Kern — Copyright (C) 2026 Alan Nicholas
 *
 * Este arquivo é software livre sob a GNU General Public License v3.0 ou
 * posterior. Veja o arquivo LICENSE na raiz do projeto.
 *
 * Portado de openScale (C) olie.xdev, arquivo BodyMiScaleLib.kt, que por sua vez
 * deriva de bodymiscale (C) dckiller51 e colaboradores — ambos GPL-3.0:
 *   https://github.com/oliexdev/openScale
 *   https://github.com/dckiller51/bodymiscale
 *
 * É por causa deste arquivo que o Kern é GPL. Se um dia ele sair, a licença
 * pode ser revista; enquanto estiver aqui, o projeto inteiro é GPL-3.0.
 */

// Composição corporal no mesmo padrão que a balança da Xiaomi usa.
//
// A peça central é a massa magra: ela é calibrada para o hardware da balança, e
// todo o resto pendura nela. É justamente por isso que valia portar em vez de
// usar equação genérica — sem essa baseline, os números não conversam com o
// aparelho que está no chão do banheiro.
//
// As etapas seguintes são literatura, não segredo: gordura pelo modelo de dois
// compartimentos de Siri (1956), água pela constante de Pace & Rathbun (1945),
// proteína por Wang (1999) e gasto basal por Schofield (padrão da OMS).

export interface EntradaXiaomi {
  pesoKg: number;
  impedancia: number;
  alturaCm: number;
  idade: number;
  sexo: "M" | "F";
}

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Massa magra (kg) — fórmula calibrada para a balança. Teto de 98% do peso.
 * Calcule esta primeiro: as outras recebem o resultado dela.
 *
 * LIMITAÇÃO conhecida, e é do original: não há termo de sexo aqui. Como mulheres
 * têm naturalmente mais gordura essencial, a estimativa sai baixa demais para
 * elas — num teste, mulher de 60 kg com 550 Ω deu 15,5% de gordura, que seria
 * nível atlético. Sexo só entra depois, no osso e na gordura visceral. Se o app
 * um dia servir a mais gente, esta é a conta que precisa de correção.
 */
export function massaMagra(e: EntradaXiaomi): number {
  const h = e.alturaCm;
  const lbm =
    (h * 9.058) / 100 * (h / 100) +
    e.pesoKg * 0.32 +
    12.226 -
    e.impedancia * 0.0068 -
    e.idade * 0.0542;
  return Math.min(lbm, e.pesoKg * 0.98);
}

/** Gordura (%) pelo modelo de 2 compartimentos de Siri (1956). */
export function gordura(pesoKg: number, lbm: number): number {
  return limitar(((pesoKg - lbm) / pesoKg) * 100, 5, 75);
}

/** Água (%) — constante 0,73 de Pace & Rathbun (1945) aplicada à massa magra. */
export function agua(gorduraPct: number): number {
  return limitar((100 - gorduraPct) * 0.73, 35, 73);
}

/** Proteína (%) — Wang (1999): cerca de 19,5% da massa magra. */
export function proteina(pesoKg: number, lbm: number): number {
  return limitar(((lbm * 0.195) / pesoKg) * 100, 5, 32);
}

/**
 * Massa óssea (kg) — fórmula empírica da balança. Os degraus de 0,1 e o salto
 * para 8,0 vêm do original; parecem arbitrários porque são: nenhuma balança mede
 * osso de verdade.
 */
export function massaOssea(lbm: number, sexo: "M" | "F"): number {
  const homem = sexo === "M";
  const base = homem ? 0.18016894 : 0.245691014;
  let osso = (base - lbm * 0.05158) * -1;
  osso = osso > 2.2 ? osso + 0.1 : osso - 0.1;
  if ((homem && osso > 5.2) || (!homem && osso > 5.1)) osso = 8.0;
  return limitar(osso, 0.5, 8);
}

/**
 * Massa muscular (kg) = peso − gordura − osso.
 *
 * Este é o número no sentido amplo, o mesmo que o app da Xiaomi mostra — inclui
 * água e vísceras, e por isso sai bem maior que o músculo esquelético.
 */
export function massaMuscular(pesoKg: number, gorduraPct: number, ossoKg: number): number {
  return limitar(pesoKg - gorduraPct * 0.01 * pesoKg - ossoKg, 10, 120);
}

/**
 * Gordura visceral (índice, não kg). Fórmula do Zepp Life, com ramos diferentes
 * conforme a relação entre altura e peso. Referência de leitura: até 9 é normal,
 * 10 a 14 pede atenção, 15 ou mais é alto.
 */
export function gorduraVisceral(e: EntradaXiaomi): number {
  const h = e.alturaCm;
  const w = e.pesoKg;
  let v: number;
  if (e.sexo === "M") {
    v =
      h < w * 1.6 + 63.0
        ? e.idade * 0.15 + ((w * 305.0) / (h * 0.0826 * h - h * 0.4 + 48.0) - 2.9)
        : e.idade * 0.15 + (w * (h * -0.0015 + 0.765) - h * 0.143) - 5.0;
  } else {
    v =
      w <= h * 0.5 - 13.0
        ? e.idade * 0.07 + (w * (h * -0.0024 + 0.691) - h * 0.027) - 10.5
        : e.idade * 0.07 + ((w * 500.0) / (h * 1.45 + h * 0.1158 * h - 120.0) - 6.0);
  }
  return limitar(v, 1, 50);
}

// Schofield (inclinação, constante) por faixa etária — padrão da OMS.
const SCHOFIELD_M: [number, number][] = [
  [59.512, -30.4], [22.706, 504.3], [17.686, 658.2],
  [15.057, 692.2], [11.472, 873.1], [11.711, 587.7],
];
const SCHOFIELD_F: [number, number][] = [
  [58.317, -31.1], [20.315, 485.9], [13.384, 692.6],
  [14.818, 486.6], [8.126, 845.6], [9.082, 658.5],
];

function faixaSchofield(idade: number): number {
  if (idade < 3) return 0;
  if (idade < 10) return 1;
  if (idade < 18) return 2;
  if (idade < 30) return 3;
  if (idade < 60) return 4;
  return 5;
}

/** Gasto basal (kcal/dia) pela equação de Schofield. */
export function gastoBasal(pesoKg: number, idade: number, sexo: "M" | "F"): number {
  const tabela = sexo === "M" ? SCHOFIELD_M : SCHOFIELD_F;
  const [inclinacao, constante] = tabela[faixaSchofield(idade)];
  return limitar(inclinacao * pesoKg + constante, 500, 5000);
}

/**
 * Idade metabólica — ATENÇÃO: esta não é a da Xiaomi.
 *
 * A fórmula deles nunca foi extraída (o openScale não tem e não há fonte
 * confiável). Em vez de chutar uma e apresentar como se fosse a mesma, aqui vai
 * uma definição própria e verificável: **a idade em que a sua gordura corporal
 * seria a esperada para o seu IMC e sexo**. Menos gordura do que a média da sua
 * idade, idade metabólica menor.
 *
 * Sai de inverter Deurenberg (1991), que é a equação que liga gordura, IMC,
 * idade e sexo:
 *     gordura% = 1,20·IMC + 0,23·idade − 10,8·(homem) − 5,4
 * isolando a idade. Usar a mesma equação dos dois lados é o ponto: a primeira
 * versão disto comparava Katch-McArdle com Schofield, e a diferença sistemática
 * entre os dois métodos virava vinte anos de idade fantasma.
 */
export function idadeMetabolica(
  gorduraPct: number,
  pesoKg: number,
  alturaCm: number,
  sexo: "M" | "F",
): number {
  const alturaM = alturaCm / 100;
  const imc = pesoKg / (alturaM * alturaM);
  const termoSexo = sexo === "M" ? 10.8 : 0;
  const idade = (gorduraPct - 1.2 * imc + termoSexo + 5.4) / 0.23;
  return Math.round(limitar(idade, 18, 80));
}

export interface ResultadoXiaomi {
  massaMagraKg: number;
  gorduraPct: number;
  massaGordaKg: number;
  aguaPct: number;
  proteinaPct: number;
  massaOsseaKg: number;
  massaMuscularKg: number;
  gorduraVisceral: number;
  tmb: number;
  idadeMetabolica: number;
}

/** Encadeia tudo na ordem certa — a massa magra alimenta o resto. */
export function calcular(e: EntradaXiaomi): ResultadoXiaomi {
  const lbm = massaMagra(e);
  const gorduraPct = gordura(e.pesoKg, lbm);
  const ossoKg = massaOssea(lbm, e.sexo);
  const tmb = gastoBasal(e.pesoKg, e.idade, e.sexo);

  const arr = (v: number) => Math.round(v * 10) / 10;
  return {
    massaMagraKg: arr(lbm),
    gorduraPct: arr(gorduraPct),
    massaGordaKg: arr(e.pesoKg - lbm),
    aguaPct: arr(agua(gorduraPct)),
    proteinaPct: arr(proteina(e.pesoKg, lbm)),
    massaOsseaKg: arr(ossoKg),
    massaMuscularKg: arr(massaMuscular(e.pesoKg, gorduraPct, ossoKg)),
    gorduraVisceral: arr(gorduraVisceral(e)),
    tmb: Math.round(tmb),
    idadeMetabolica: idadeMetabolica(gorduraPct, e.pesoKg, e.alturaCm, e.sexo),
  };
}
