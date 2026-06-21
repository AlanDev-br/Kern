"use client";

import { Capacitor } from "@capacitor/core";
import { HealthConnect } from "@devmaxime/capacitor-health-connect";

type Leitura = "SleepSession" | "ActivitySession" | "Steps" | "RestingHeartRate";
const LEITURA: Leitura[] = ["SleepSession", "ActivitySession", "Steps", "RestingHeartRate"];

export function saudeNativa(): boolean {
  return Capacitor.isNativePlatform();
}

export type StatusSaude = "indisponivel" | "sem-app" | "sem-permissao" | "ok";

export interface PermsSaude {
  sono: boolean;
  treino: boolean;
  passos: boolean;
  fc: boolean;
}

async function permissoesConcedidas(): Promise<PermsSaude> {
  try {
    const granted = await HealthConnect.getGrantedPermissions();
    const read = granted.read ?? [];
    return {
      sono: read.includes("SleepSession"),
      treino: read.includes("ActivitySession"),
      passos: read.includes("Steps"),
      fc: read.includes("RestingHeartRate"),
    };
  } catch {
    return { sono: false, treino: false, passos: false, fc: false };
  }
}

export function todasPermissoes(p: PermsSaude): boolean {
  return p.sono && p.treino && p.passos && p.fc;
}

export async function statusSaude(): Promise<StatusSaude> {
  if (!saudeNativa()) return "indisponivel";
  try {
    const { availability } = await HealthConnect.checkAvailability();
    if (availability === "NotSupported") return "indisponivel";
    if (availability === "NotInstalled") return "sem-app";
    const p = await permissoesConcedidas();
    // basta UMA permissão para o card já funcionar
    return p.sono || p.treino || p.passos || p.fc ? "ok" : "sem-permissao";
  } catch {
    return "sem-permissao";
  }
}

export async function pedirPermissoesSaude(): Promise<boolean> {
  if (!saudeNativa()) return false;
  try {
    await HealthConnect.requestPermissions({ read: LEITURA, write: [] });
    const p = await permissoesConcedidas();
    return p.sono || p.treino || p.passos || p.fc;
  } catch {
    return false;
  }
}

// extrai um Date de campos possíveis do registro nativo
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

export interface ResumoSaude {
  acordouEm: Date | null; // fim do último sono, se foi hoje
  sonoMin: number;
  treinoMin: number;
  treinoSessoes: number;
  passos: number;
  fcRepouso: number | null;
  // diagnóstico
  perms: PermsSaude;
  sonoRegistros: number;
  treinoRegistros: number;
  ultimoSonoFim: Date | null;
  erro: string | null;
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
    treinoMin: 0,
    treinoSessoes: 0,
    passos: 0,
    fcRepouso: null,
    perms,
    sonoRegistros: 0,
    treinoRegistros: 0,
    ultimoSonoFim: null,
    erro: null,
  };

  const addErro = (msg: string) => {
    resumo.erro = resumo.erro ? `${resumo.erro} | ${msg}` : msg;
  };

  // ── Sono ──
  if (perms.sono) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "SleepSession",
        start: janelaSono.toISOString(),
        end: agora.toISOString(),
      });
      resumo.sonoRegistros = records.length;
      let fimMaisRecente: Date | null = null;
      let inicioDoMaisRecente: Date | null = null;
      for (const r of records as Record<string, unknown>[]) {
        const fim = lerInstante(r, "endTime", "endDate", "end");
        const ini = lerInstante(r, "startTime", "startDate", "start");
        if (fim && (!fimMaisRecente || fim > fimMaisRecente)) {
          fimMaisRecente = fim;
          inicioDoMaisRecente = ini;
        }
      }
      resumo.ultimoSonoFim = fimMaisRecente;
      if (fimMaisRecente && mesmaData(fimMaisRecente, agora)) {
        resumo.acordouEm = fimMaisRecente;
        if (inicioDoMaisRecente) {
          resumo.sonoMin = Math.round(
            (fimMaisRecente.getTime() - inicioDoMaisRecente.getTime()) / 60000,
          );
        }
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
      resumo.treinoRegistros = records.length;
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

  // ── Passos (agregado do dia) ──
  if (perms.passos) {
    try {
      const { aggregates } = await HealthConnect.aggregateRecords({
        type: "Steps",
        start: inicioDia.toISOString(),
        end: agora.toISOString(),
        groupBy: "day",
      });
      resumo.passos = aggregates.reduce((s, a) => s + (a.value ?? 0), 0);
    } catch (e) {
      addErro(`Passos: ${(e as Error)?.message ?? e}`);
    }
  }

  // ── Frequência cardíaca em repouso (último registro de hoje) ──
  if (perms.fc) {
    try {
      const { records } = await HealthConnect.readRecords({
        type: "RestingHeartRate",
        start: inicioDia.toISOString(),
        end: agora.toISOString(),
      });
      let maisRecente: Date | null = null;
      let bpm: number | null = null;
      for (const r of records as Record<string, unknown>[]) {
        const t = lerInstante(r, "time", "startTime");
        const v = lerNumero(r, "beatsPerMinute", "bpm");
        if (t && v !== null && (!maisRecente || t > maisRecente)) {
          maisRecente = t;
          bpm = v;
        }
      }
      resumo.fcRepouso = bpm;
    } catch (e) {
      addErro(`FC: ${(e as Error)?.message ?? e}`);
    }
  }

  return resumo;
}
