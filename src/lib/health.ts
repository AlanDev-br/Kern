"use client";

import { Capacitor } from "@capacitor/core";
import { HealthConnect } from "@devmaxime/capacitor-health-connect";

// Tipos lidos. "HeartRate" (intradiário) é usado só para estimar o despertar.
const LEITURA_REQ = [
  "SleepSession",
  "ActivitySession",
  "Steps",
  "RestingHeartRate",
  "HeartRate",
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
      fcIntra: read.includes("HeartRate"),
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
    // o tipo do plugin não lista "HeartRate", mas o runtime aceita — daí o cast
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
      let maisRecente: Date | null = null;
      const origens: { origem: string; valor: number; data: string }[] = [];
      
      for (const r of records as Record<string, unknown>[]) {
        const t = lerInstante(r, "time", "startTime");
        const v = lerNumero(r, "beatsPerMinute", "bpm");
        const origin = (r.metadata as Record<string, unknown>)?.dataOrigin as string || "unknown";
        if (t && v !== null) {
          origens.push({ origem: origin, valor: v, data: t.toLocaleString("pt-BR") });
          if (!maisRecente || t > maisRecente) {
            maisRecente = t;
            resumo.fcRepouso = v;
            resumo.fcRepousoHora = t;
          }
        }
      }
      resumo.fcRepousoOrigens = origens;
    } catch (e) {
      addErro(`FC repouso: ${(e as Error)?.message ?? e}`);
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

  // ── Estimativa final do despertar: o sinal mais cedo ──
  const candidatos: { t: Date; tipo: "fc" | "passos" }[] = [];
  if (resumo.fcWake && mesmaData(resumo.fcWake, agora)) candidatos.push({ t: resumo.fcWake, tipo: "fc" });
  if (resumo.stepsWake && mesmaData(resumo.stepsWake, agora)) candidatos.push({ t: resumo.stepsWake, tipo: "passos" });
  if (candidatos.length) {
    candidatos.sort((a, b) => a.t.getTime() - b.t.getTime());
    resumo.acordarEstimado = candidatos[0].t;
    resumo.acordarOrigem = candidatos.length === 2 ? "fc+passos" : candidatos[0].tipo;
  }

  return resumo;
}
