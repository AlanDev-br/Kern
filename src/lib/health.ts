"use client";

import { Capacitor } from "@capacitor/core";
import { HealthConnect } from "@devmaxime/capacitor-health-connect";
import { db } from "./db";

// Tipos lidos. A série intradiária de frequência cardíaca serve só para estimar o
// despertar.
//
// O nome dela no Health Connect é "HeartRateSeries", não "HeartRate": a chave sai do
// RECORDS_TYPE_NAME_MAP da androidx, e o "HeartRate" que aparece em `aggregateRecords`
// é de outro vocabulário, o dos agregados. O plugin descarta em silêncio a chave que
// não conhece — então pedir "HeartRate" nunca pediu nada, e a permissão ficava
// eternamente negada.
export const TIPO_FC_SERIE = "HeartRateSeries";

const LEITURA_REQ = [
  "SleepSession",
  "ActivitySession",
  "Steps",
  "RestingHeartRate",
  TIPO_FC_SERIE,
];

export function saudeNativa(): boolean {
  return Capacitor.isNativePlatform();
}

export type StatusSaude = "indisponivel" | "sem-app" | "sem-permissao" | "ok";

export interface PermsSaude {
  sono: boolean;
  treino: boolean;
  passos: boolean;
  fcRepouso: boolean;
  fcIntra: boolean;
}

async function permissoesConcedidas(): Promise<PermsSaude> {
  try {
    const granted = await HealthConnect.getGrantedPermissions();
    const read = (granted.read ?? []) as string[];
    return {
      sono: read.includes("SleepSession"),
      treino: read.includes("ActivitySession"),
      passos: read.includes("Steps"),
      fcRepouso: read.includes("RestingHeartRate"),
      fcIntra: read.includes(TIPO_FC_SERIE),
    };
  } catch {
    return { sono: false, treino: false, passos: false, fcRepouso: false, fcIntra: false };
  }
}

export function todasPermissoes(p: PermsSaude): boolean {
  return p.sono && p.treino && p.passos && p.fcRepouso && p.fcIntra;
}

export async function statusSaude(): Promise<StatusSaude> {
  if (!saudeNativa()) return "indisponivel";
  try {
    const { availability } = await HealthConnect.checkAvailability();
    if (availability === "NotSupported") return "indisponivel";
    if (availability === "NotInstalled") return "sem-app";
    const p = await permissoesConcedidas();
    return p.sono || p.treino || p.passos || p.fcRepouso || p.fcIntra ? "ok" : "sem-permissao";
  } catch {
    return "sem-permissao";
  }
}

export async function pedirPermissoesSaude(): Promise<boolean> {
  if (!saudeNativa()) return false;
  try {
    // o tipo do plugin não lista a série de FC, mas o runtime aceita — daí o cast
    await HealthConnect.requestPermissions({
      read: LEITURA_REQ as never,
      write: [],
    });
    const p = await permissoesConcedidas();
    return p.sono || p.treino || p.passos || p.fcRepouso || p.fcIntra;
  } catch {
    return false;
  }
}

function lerInstante(rec: Record<string, unknown>, ...chaves: string[]): Date | null {
  for (const k of chaves) {
    const v = rec[k];
    if (typeof v === "string" && v.length > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function lerNumero(rec: Record<string, unknown>, ...chaves: string[]): number | null {
  for (const k of chaves) {
    const v = rec[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type OrigemAcordar = "sono" | "fc+passos" | "fc" | "passos" | null;

export interface ResumoSaude {
  // sono real (raro vir da Huawei)
  acordouEm: Date | null;
  sonoMin: number;
  // estimativa por FC + passos
  acordarEstimado: Date | null;
  acordarOrigem: OrigemAcordar;
  // estimativa do horário de dormir (início do bloco de sono da noite)
  dormiuEstimado: Date | null;
  // métricas que a Huawei envia
  treinoMin: number;
  treinoSessoes: number;
  passos: number;
  fcRepouso: number | null;
  // diagnóstico
  perms: PermsSaude;
  sonoRegistros: number;
  ultimoSonoFim: Date | null;
  fcWake: Date | null;
  stepsWake: Date | null;
  erro: string | null;
  passosOrigens?: { origem: string; passos: number }[];
  fcRepousoHora?: Date | null;
  fcRepousoOrigens?: { origem: string; valor: number; data: string }[];
  fcRepousoRegistros?: number; // qtos RestingHeartRate vieram (diagnóstico)
  fcIntraHoras?: number; // qtas horas de HeartRate vieram em 24h (diagnóstico)
  fcRepousoReaproveitada?: boolean; // valor veio do cache (dia ainda sem dado)
  // true quando não veio RestingHeartRate e o número foi derivado dos mínimos
  // horários da FC contínua. É estimativa, e a tela deve dizer isso.
  fcRepousoEstimada?: boolean;
}

export async function lerSaudeHoje(): Promise<ResumoSaude> {
  const agora = new Date();
  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);
  const janelaSono = new Date(agora.getTime() - 36 * 3600 * 1000);

  const perms = await permissoesConcedidas();
  const resumo: ResumoSaude = {
    acordouEm: null,
    sonoMin: 0,
    acordarEstimado: null,
    acordarOrigem: null,
    dormiuEstimado: null,
    treinoMin: 0,
    treinoSessoes: 0,
    passos: 0,
    fcRepouso: null,
    perms,
    sonoRegistros: 0,
    ultimoSonoFim: null,
    fcWake: null,
    stepsWake: null,
    erro: null,
    passosOrigens: [],
    fcRepousoHora: null,
    fcRepousoOrigens: [],
    fcRepousoRegistros: 0,
    fcIntraHoras: 0,
  };

  const addErro = (msg: string) => {
    resumo.erro = resumo.erro ? `${resumo.erro} | ${msg}` : msg;
  };

  // ── Sono real (se a Huawei mandar) ──
  if (perms.sono) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "SleepSession",
        start: janelaSono.toISOString(),
        end: agora.toISOString(),
      });
      resumo.sonoRegistros = records.length;
      let fim: Date | null = null;
      let ini: Date | null = null;
      for (const r of records as Record<string, unknown>[]) {
        const f = lerInstante(r, "endTime", "endDate", "end");
        const i = lerInstante(r, "startTime", "startDate", "start");
        if (f && (!fim || f > fim)) {
          fim = f;
          ini = i;
        }
      }
      resumo.ultimoSonoFim = fim;
      if (fim && mesmaData(fim, agora)) {
        resumo.acordouEm = fim;
        if (ini) resumo.sonoMin = Math.round((fim.getTime() - ini.getTime()) / 60000);
      }
    } catch (e) {
      addErro(`Sono: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Exercício ──
  if (perms.treino) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "ActivitySession",
        start: inicioDia.toISOString(),
        end: agora.toISOString(),
      });
      for (const r of records as Record<string, unknown>[]) {
        const ini = lerInstante(r, "startTime", "startDate", "start");
        const fim = lerInstante(r, "endTime", "endDate", "end");
        if (ini && fim) {
          resumo.treinoSessoes++;
          resumo.treinoMin += Math.round((fim.getTime() - ini.getTime()) / 60000);
        }
      }
    } catch (e) {
      addErro(`Treino: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Passos: total do dia + primeiro movimento da manhã ──
  if (perms.passos) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "Steps",
        start: inicioDia.toISOString(),
        end: agora.toISOString(),
      });
      let primeiro: Date | null = null;
      const passosPorOrigem: Record<string, number> = {};

      for (const r of records as Record<string, unknown>[]) {
        const count = lerNumero(r, "count") ?? 0;
        const origin = (r.metadata as Record<string, unknown>)?.dataOrigin as string || "unknown";
        passosPorOrigem[origin] = (passosPorOrigem[origin] || 0) + count;

        const ini = lerInstante(r, "startTime", "startDate", "start");
        const fim = lerInstante(r, "endTime", "endDate", "end");
        // ignora registros de dia inteiro (>3h) — não servem para o horário
        const durOk = ini && fim ? fim.getTime() - ini.getTime() < 3 * 3600 * 1000 : true;
        if (ini && durOk && count >= 5) {
          const h = ini.getHours();
          if (h >= 3 && h <= 11 && (!primeiro || ini < primeiro)) primeiro = ini;
        }
      }
      resumo.stepsWake = primeiro;
      resumo.passosOrigens = Object.entries(passosPorOrigem).map(([origem, passos]) => ({ origem, passos }));

      // Total de passos: usa o agregado do Health Connect, que de-duplica os passos
      // sobrepostos de várias fontes (Huawei, sensor do celular) pela prioridade
      // definida nos Ajustes do Health Connect. É o que evita a dupla contagem.
      let totalAgg = 0;
      try {
        const { aggregates } = await HealthConnect.aggregateRecords({
          type: "Steps",
          start: inicioDia.toISOString(),
          end: agora.toISOString(),
          groupBy: "day",
        });
        totalAgg = aggregates.reduce((s, a) => s + (a.value ?? 0), 0);
      } catch {
        /* sem agregado disponível — cai no fallback abaixo */
      }
      if (totalAgg > 0) {
        resumo.passos = totalAgg;
      } else {
        // fallback: maior contagem entre as origens (evita somar fontes duplicadas)
        resumo.passos = Object.values(passosPorOrigem).reduce((m, v) => Math.max(m, v), 0);
      }
    } catch (e) {
      addErro(`Passos: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── FC de repouso (último valor de hoje) ──
  if (perms.fcRepouso) {
    try {
      // Usamos a janela de sono (36h) para pegar frequências registradas durante a madrugada anterior
      const { records } = await HealthConnect.readRecords({
        type: "RestingHeartRate",
        start: janelaSono.toISOString(),
        end: agora.toISOString(),
      });
      resumo.fcRepousoRegistros = records.length;
      let maisRecente: Date | null = null;
      const origens: { origem: string; valor: number; data: string }[] = [];

      for (const r of records as Record<string, unknown>[]) {
        const t = lerInstante(r, "time", "startTime");
        const v = lerNumero(r, "beatsPerMinute", "bpm");
        const origin = (r.metadata as Record<string, unknown>)?.dataOrigin as string || "unknown";
        if (t && v !== null) {
          origens.push({ origem: origin, valor: v, data: t.toLocaleString("pt-BR") });
          // O critério é o MENOR valor da janela, não o mais recente. A janela
          // tem 36h e a pulseira grava mais de um registro: pegando o último,
          // uma leitura de fim de tarde — depois de café, escada ou estresse —
          // ganhava da madrugada, que é quando o repouso de fato acontece.
          if (resumo.fcRepouso === null || v < resumo.fcRepouso) {
            resumo.fcRepouso = v;
            resumo.fcRepousoHora = t;
          }
          if (!maisRecente || t > maisRecente) maisRecente = t;
        }
      }
      resumo.fcRepousoOrigens = origens;
    } catch (e) {
      addErro(`FC repouso: ${(e as Error)?.message ?? e}`);
    }
  }

  // FC intradiária (24h) — conta as horas (diagnóstico) e serve de fallback de
  // repouso: se não veio RestingHeartRate, usa a menor FC das últimas 24h.
  if (perms.fcIntra) {
    try {
      const ontem = new Date(agora.getTime() - 24 * 3600 * 1000);
      const { aggregates } = await HealthConnect.aggregateRecords({
        type: "HeartRate",
        start: ontem.toISOString(),
        end: agora.toISOString(),
        groupBy: "hour",
      });
      // `value` é a MÉDIA da hora (BPM_AVG). Tirar o mínimo das médias horárias
      // dá "a hora mais calma", que é estruturalmente muito acima da FC de
      // repouso real — foi o que fazia o número sair sempre alto. O agregado
      // também traz `min` (BPM_MIN), que é o batimento mais baixo de fato, e é
      // esse que se aproxima do repouso.
      const medias = aggregates.map((a) => a.value ?? 0).filter((v) => v > 0);
      resumo.fcIntraHoras = medias.length;

      const minimos = aggregates
        .map((a) => (a as { min?: number }).min ?? 0)
        .filter((v) => v > 30); // abaixo de 30 bpm é artefato do sensor, não pessoa

      if (resumo.fcRepouso === null && minimos.length) {
        // A média dos três mínimos horários mais baixos, em vez do menor de
        // todos: um único batimento espúrio não deve definir o valor do dia.
        const maisBaixos = minimos.sort((a, b) => a - b).slice(0, 3);
        resumo.fcRepouso = Math.round(maisBaixos.reduce((s, v) => s + v, 0) / maisBaixos.length);
        resumo.fcRepousoEstimada = true;
      }
    } catch (e) {
      addErro(`FC 24h: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── FC intradiária (por hora) → detecta o despertar ──
  if (perms.fcIntra) {
    try {
      const { aggregates } = await HealthConnect.aggregateRecords({
        type: "HeartRate",
        start: inicioDia.toISOString(),
        end: agora.toISOString(),
        groupBy: "hour",
      });
      const horas = aggregates
        .map((a) => ({ t: new Date(a.startTime), v: a.value ?? 0 }))
        .filter((h) => !isNaN(h.t.getTime()) && h.v > 0);
      // linha de base do sono: menor FC entre 0h–5h
      const madrugada = horas.filter((h) => h.t.getHours() <= 5);
      const base = (madrugada.length ? madrugada : horas).reduce(
        (m, h) => Math.min(m, h.v),
        Infinity,
      );
      if (isFinite(base)) {
        const limiar = base + 8; // FC subiu ~8 bpm acima do sono = acordou
        const acordou = horas
          .filter((h) => h.t.getHours() >= 4 && h.v >= limiar)
          .sort((a, b) => a.t.getTime() - b.t.getTime())[0];
        if (acordou) resumo.fcWake = acordou.t;

        // Fallback da FC de repouso: se a Huawei não enviou o RestingHeartRate ao
        // Health Connect, usa a menor FC da madrugada como aproximação.
        if (resumo.fcRepouso === null) resumo.fcRepouso = Math.round(base);
      }
    } catch (e) {
      addErro(`FC intra: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Estimativa do horário de dormir: início do bloco de sono da noite (via FC) ──
  if (perms.fcIntra) {
    try {
      const ontem18 = new Date(inicioDia.getTime() - 6 * 3600 * 1000); // ontem 18:00
      const { aggregates } = await HealthConnect.aggregateRecords({
        type: "HeartRate",
        start: ontem18.toISOString(),
        end: agora.toISOString(),
        groupBy: "hour",
      });
      const horas = aggregates
        .map((a) => ({ t: new Date(a.startTime), v: a.value ?? 0 }))
        .filter((h) => !isNaN(h.t.getTime()) && h.v > 0)
        .sort((a, b) => a.t.getTime() - b.t.getTime());
      if (horas.length) {
        const base = horas.reduce((m, h) => Math.min(m, h.v), Infinity);
        // hora "dormindo" = FC perto da linha de base
        const dormindo = horas.map((h) => h.v <= base + 8);
        // maior sequência contígua de horas dormindo = o sono da noite
        let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
        for (let i = 0; i < dormindo.length; i++) {
          if (dormindo[i]) {
            if (curStart < 0) curStart = i;
            curLen++;
            if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
          } else {
            curStart = -1;
            curLen = 0;
          }
        }
        if (bestStart >= 0 && bestLen >= 3) {
          const inicioSono = horas[bestStart].t;
          const h = inicioSono.getHours();
          // só aceita se o início cair num horário plausível de dormir (19h–03h)
          if (h >= 19 || h <= 3) resumo.dormiuEstimado = inicioSono;
        }
      }
    } catch (e) {
      addErro(`Dormir: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Estimativa final do despertar: o sinal mais cedo ──
  const candidatos: { t: Date; tipo: "fc" | "passos" }[] = [];
  if (resumo.fcWake && mesmaData(resumo.fcWake, agora)) candidatos.push({ t: resumo.fcWake, tipo: "fc" });
  if (resumo.stepsWake && mesmaData(resumo.stepsWake, agora)) candidatos.push({ t: resumo.stepsWake, tipo: "passos" });
  if (candidatos.length) {
    candidatos.sort((a, b) => a.t.getTime() - b.t.getTime());
    resumo.acordarEstimado = candidatos[0].t;
    resumo.acordarOrigem = candidatos.length === 2 ? "fc+passos" : candidatos[0].tipo;
  }

  // ── FC de repouso: persiste e reaproveita ──
  // O Health Connect às vezes só popula a FC de repouso de um dia para o outro.
  // Como ela varia pouco, guardamos o último valor e o reutilizamos enquanto o
  // dado do dia não chega — em vez de mostrar "—" e perder a informação.
  try {
    const CHAVE = "kern_fc_repouso";
    // O valor guardado vale por poucos dias. Sem prazo, uma leitura ruim gravada
    // uma vez ficava para sempre: como o app só reaproveita quando não veio dado
    // novo, o número errado se reapresentava indefinidamente e nunca era
    // corrigido — que é como uma FC alta se torna permanente na tela.
    const VALIDADE_DIAS = 3;
    if (resumo.fcRepouso !== null && resumo.fcRepouso > 0) {
      localStorage.setItem(CHAVE, JSON.stringify({ valor: resumo.fcRepouso, data: agora.toISOString() }));
    } else {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) {
        const { valor, data } = JSON.parse(salvo) as { valor: number; data?: string };
        const idadeDias = data
          ? (agora.getTime() - new Date(data).getTime()) / 86400000
          : Infinity;
        if (valor > 0 && idadeDias <= VALIDADE_DIAS) {
          resumo.fcRepouso = valor;
          resumo.fcRepousoReaproveitada = true;
        } else {
          localStorage.removeItem(CHAVE); // vencido: melhor "—" que número mentiroso
        }
      }
    }
  } catch {
    /* sem localStorage */
  }

  return resumo;
}

export async function sincronizarCardioRecente(): Promise<void> {
  if (!saudeNativa()) return;
  const status = await statusSaude();
  if (status !== "ok") return;

  try {
    const agora = new Date();
    const start = new Date(agora.getTime() - 4 * 24 * 3600 * 1000); // 4 dias atrás

    const { records } = await HealthConnect.readRecords({
      type: "ActivitySession",
      start: start.toISOString(),
      end: agora.toISOString(),
    });

    for (const r of records as Record<string, unknown>[]) {
      // 70 = EXERCISE_TYPE_STRENGTH_TRAINING, 81 = EXERCISE_TYPE_WEIGHTLIFTING
      const typeId = Number(r.exerciseTypeId) || 0;
      if (typeId === 70 || typeId === 81) continue;

      const ini = lerInstante(r, "startTime", "startDate", "start");
      const fim = lerInstante(r, "endTime", "endDate", "end");
      if (!ini || !fim) continue;

      const minutos = Math.round((fim.getTime() - ini.getTime()) / 60000);
      if (minutos <= 0) continue;

      const recordId = (r.metadata as Record<string, unknown>)?.id as string || Math.random().toString();
      const dataYmd = ini.toISOString().split("T")[0]; // YYYY-MM-DD

      const mapearTipoCardio = (id: number, title?: string): string => {
        if (title && title.trim().length > 0) return title;
        switch (id) {
          case 56: case 57: return "Corrida";
          case 79: return "Caminhada";
          case 8: case 9: return "Bicicleta";
          case 25: return "Elíptico";
          case 73: case 74: return "Natação";
          case 36: return "HIIT";
          default: return "Cardio";
        }
      };

      await db.cardios.put({
        id: recordId,
        tipo: mapearTipoCardio(typeId, r.title as string),
        minutos,
        data: dataYmd,
        origem: "health_connect",
      });
    }
  } catch (e) {
    console.error("Erro ao sincronizar cardio do Health Connect", e);
  }
}

// ── Agregado de vários dias, para o coach ────────────────────────────────────
//
// `lerSaudeHoje` responde "como foi hoje". O coach precisa de outra coisa: como
// tem sido a semana. Uma noite ruim não muda conduta; cinco mudam.

export interface ResumoPeriodo {
  dias: number;
  /** Média por noite, em minutos. Null quando o aparelho não manda sono. */
  sonoMedioMin: number | null;
  noitesComRegistro: number;
  fcRepousoMedia: number | null;
  /** Estimativa de VO2 máx (ml/kg/min), ou null quando falta FC de repouso. */
  vo2max: number | null;
  sessoesTreino: number;
  passosMediaDia: number | null;
}

/**
 * VO2 máx estimado pela razão entre frequência cardíaca máxima e de repouso
 * (Uth et al., 2004): VO2máx ≈ 15,3 × FCmáx / FCrepouso. A FCmáx sai de Tanaka
 * (208 − 0,7 × idade), mais fiel que a regra dos 220 menos a idade.
 *
 * É estimativa de gabinete, não teste ergoespirométrico: serve para acompanhar a
 * direção ao longo dos meses, não para cravar um número. Sem FC de repouso —
 * caso da maioria das pulseiras que não escrevem no Health Connect — devolve
 * null, e o coach trata como dado ausente em vez de inventar.
 */
export function estimarVo2max(fcRepouso: number | null, idade: number): number | null {
  if (!fcRepouso || fcRepouso < 30 || fcRepouso > 120 || !idade) return null;
  const fcMax = 208 - 0.7 * idade;
  const vo2 = 15.3 * (fcMax / fcRepouso);
  return vo2 > 15 && vo2 < 90 ? Math.round(vo2 * 10) / 10 : null;
}

export async function lerSaudePeriodo(dias = 7, idade = 0): Promise<ResumoPeriodo> {
  const vazio: ResumoPeriodo = {
    dias,
    sonoMedioMin: null,
    noitesComRegistro: 0,
    fcRepousoMedia: null,
    vo2max: null,
    sessoesTreino: 0,
    passosMediaDia: null,
  };
  if (!saudeNativa()) return vazio;

  const fim = new Date();
  const inicio = new Date(fim.getTime() - dias * 86400000);
  const perms = await permissoesConcedidas();

  if (perms.sono) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "SleepSession",
        start: inicio.toISOString(),
        end: fim.toISOString(),
      });
      // Uma noite pode vir fatiada em vários registros (ciclos): agrupa pela
      // data do fim, senão a média por noite fica dividida pelo número de pedaços.
      const porNoite = new Map<string, number>();
      for (const r of records as Record<string, unknown>[]) {
        const i = lerInstante(r, "startTime", "startDate", "start");
        const f = lerInstante(r, "endTime", "endDate", "end");
        if (!i || !f) continue;
        const chave = f.toISOString().slice(0, 10);
        const min = Math.round((f.getTime() - i.getTime()) / 60000);
        if (min > 0) porNoite.set(chave, (porNoite.get(chave) ?? 0) + min);
      }
      if (porNoite.size > 0) {
        const total = [...porNoite.values()].reduce((s, v) => s + v, 0);
        vazio.sonoMedioMin = Math.round(total / porNoite.size);
        vazio.noitesComRegistro = porNoite.size;
      }
    } catch {
      // sem sono no período — segue com null
    }
  }

  if (perms.fcRepouso) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "RestingHeartRate",
        start: inicio.toISOString(),
        end: fim.toISOString(),
      });
      const valores: number[] = [];
      for (const r of records as Record<string, unknown>[]) {
        const v = lerNumero(r, "beatsPerMinute", "bpm", "value");
        if (v && v > 30 && v < 120) valores.push(v);
      }
      if (valores.length > 0) {
        vazio.fcRepousoMedia = Math.round(valores.reduce((s, v) => s + v, 0) / valores.length);
        vazio.vo2max = estimarVo2max(vazio.fcRepousoMedia, idade);
      }
    } catch {
      // sem FC no período
    }
  }

  if (perms.treino) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "ActivitySession",
        start: inicio.toISOString(),
        end: fim.toISOString(),
      });
      vazio.sessoesTreino = records.length;
    } catch {
      // sem sessões
    }
  }

  return vazio;
}
