// Consolidação diária das amostras do Health Connect.
//
// Nada disso é gravado: é função pura sobre `saudeAmostras`. A regra do projeto para
// a balança vale igual aqui — guardar o bruto, derivar sob demanda. Consolidado em
// tabela envelhece mal: basta a Xiaomi corrigir um dia retroativamente para o número
// salvo e o número real discordarem para sempre.

import type { AmostraSaude, TipoSaude } from "./kern-health";

export interface DiaSaude {
  data: string;
  // movimento
  passos?: number;
  distanciaM?: number;
  andares?: number;
  // energia
  kcalTotal?: number;
  kcalAtiva?: number;
  tmbKcal?: number;
  // coração e respiração
  fcRepouso?: number;
  fcMedia?: number;
  fcMin?: number;
  fcMax?: number;
  vfcMs?: number;
  spo2Pct?: number;
  respiracao?: number;
  vo2max?: number;
  // sono
  sonoMin?: number;
  sonoEstagios?: Record<string, number>;
  // treino
  treinoMin?: number;
  treinoSessoes?: number;
  // corpo (quando alguém escreve peso/gordura no Health Connect)
  pesoKg?: number;
  gorduraPct?: number;
  /** Pacotes que escreveram algo neste dia. */
  fontes: string[];
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/**
 * Soma acumulativa sem contar duas vezes.
 *
 * Passos, distância e calorias são publicados por mais de um app ao mesmo tempo —
 * a pulseira e o sensor do próprio celular contam a mesma caminhada. Somar tudo
 * infla o dia. Somamos por pacote de origem e ficamos com o maior: é a mesma decisão
 * que o Health Connect toma internamente ao agregar por prioridade, e é conservadora
 * na direção certa (subestimar é menos danoso que inventar movimento).
 */
function somaSemDuplicar(amostras: AmostraSaude[]): { valor?: number; origem?: string } {
  const porOrigem = new Map<string, number>();
  for (const a of amostras) {
    const v = num(a.valor);
    if (v === undefined) continue;
    porOrigem.set(a.origem, (porOrigem.get(a.origem) ?? 0) + v);
  }
  let melhor: { valor?: number; origem?: string } = {};
  for (const [origem, valor] of porOrigem) {
    if (melhor.valor === undefined || valor > melhor.valor) melhor = { valor, origem };
  }
  return melhor;
}

/** Último valor do dia. Serve para medida pontual: FC de repouso, VO₂, peso. */
function ultimo(amostras: AmostraSaude[]): number | undefined {
  let escolhido: AmostraSaude | undefined;
  for (const a of amostras) {
    if (num(a.valor) === undefined) continue;
    if (!escolhido || a.inicio > escolhido.inicio) escolhido = a;
  }
  return escolhido ? num(escolhido.valor) : undefined;
}

/** Média das amostras do dia. Para SpO2 e respiração, que vêm em várias leituras. */
function media(amostras: AmostraSaude[]): number | undefined {
  const vals = amostras.map((a) => num(a.valor)).filter((v): v is number => v !== undefined);
  if (vals.length === 0) return undefined;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function arred(v: number | undefined, casas = 0): number | undefined {
  if (v === undefined) return undefined;
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

export function consolidarDias(amostras: AmostraSaude[]): DiaSaude[] {
  const porDia = new Map<string, AmostraSaude[]>();
  for (const a of amostras) {
    const lista = porDia.get(a.data);
    if (lista) lista.push(a);
    else porDia.set(a.data, [a]);
  }

  const dias: DiaSaude[] = [];
  for (const [data, lista] of porDia) {
    const de = (t: TipoSaude) => lista.filter((a) => a.tipo === t);
    const dia: DiaSaude = { data, fontes: [...new Set(lista.map((a) => a.origem))] };

    dia.passos = arred(somaSemDuplicar(de("Steps")).valor);
    dia.distanciaM = arred(somaSemDuplicar(de("Distance")).valor);
    dia.andares = arred(somaSemDuplicar(de("FloorsClimbed")).valor);
    dia.kcalTotal = arred(somaSemDuplicar(de("TotalCaloriesBurned")).valor);
    dia.kcalAtiva = arred(somaSemDuplicar(de("ActiveCaloriesBurned")).valor);
    dia.tmbKcal = arred(ultimo(de("BasalMetabolicRate")));

    dia.fcRepouso = arred(ultimo(de("RestingHeartRate")));
    dia.vfcMs = arred(media(de("HeartRateVariabilityRmssd")), 1);
    dia.spo2Pct = arred(media(de("OxygenSaturation")), 1);
    dia.respiracao = arred(media(de("RespiratoryRate")), 1);
    dia.vo2max = arred(ultimo(de("Vo2Max")), 1);
    dia.pesoKg = arred(ultimo(de("Weight")), 2);
    dia.gorduraPct = arred(ultimo(de("BodyFat")), 1);

    // FC contínua: a média das amostras da série, não a média das médias por
    // registro — um registro de 2 amostras pesaria igual a um de 800.
    const fc = de("HeartRateSeries");
    if (fc.length > 0) {
      let soma = 0;
      let n = 0;
      let min: number | undefined;
      let max: number | undefined;
      for (const a of fc) {
        const amostrasFc = a.extra?.amostras as { v?: number }[] | undefined;
        if (!Array.isArray(amostrasFc)) continue;
        for (const s of amostrasFc) {
          const v = num(s?.v);
          if (v === undefined) continue;
          soma += v;
          n++;
          if (min === undefined || v < min) min = v;
          if (max === undefined || v > max) max = v;
        }
      }
      if (n > 0) {
        dia.fcMedia = arred(soma / n);
        dia.fcMin = arred(min);
        dia.fcMax = arred(max);
      }
    }

    // Sono: uma noite costuma vir fatiada em vários registros. Somamos a duração e
    // acumulamos os estágios; agrupar por data do início já joga a noite no dia em
    // que ela terminou na maioria dos casos, que é como o app conta o "acordar".
    const sono = de("SleepSession");
    if (sono.length > 0) {
      let total = 0;
      const estagios: Record<string, number> = {};
      for (const a of sono) {
        total += num(a.duracaoMin) ?? 0;
        const porEstagio = a.extra?.minPorEstagio as Record<string, number> | undefined;
        if (porEstagio) {
          for (const [k, v] of Object.entries(porEstagio)) {
            const n = num(v);
            if (n !== undefined) estagios[k] = (estagios[k] ?? 0) + n;
          }
        }
      }
      if (total > 0) dia.sonoMin = arred(total);
      if (Object.keys(estagios).length > 0) {
        dia.sonoEstagios = Object.fromEntries(
          Object.entries(estagios).map(([k, v]) => [k, arred(v) ?? 0]),
        );
      }
    }

    const treinos = de("ActivitySession");
    if (treinos.length > 0) {
      dia.treinoSessoes = treinos.length;
      dia.treinoMin = arred(treinos.reduce((s, a) => s + (num(a.duracaoMin) ?? 0), 0));
    }

    dias.push(dia);
  }

  return dias.sort((a, b) => a.data.localeCompare(b.data));
}

/** Média dos dias que têm o campo. Ignora ausência em vez de tratá-la como zero. */
export function mediaDe(dias: DiaSaude[], campo: keyof DiaSaude): number | undefined {
  const vals = dias
    .map((d) => d[campo])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return undefined;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}
