"use client";

import { Capacitor } from "@capacitor/core";
import { HealthConnect } from "@devmaxime/capacitor-health-connect";

const LEITURA: ("SleepSession" | "ActivitySession")[] = ["SleepSession", "ActivitySession"];

export function saudeNativa(): boolean {
  return Capacitor.isNativePlatform();
}

export type StatusSaude = "indisponivel" | "sem-app" | "sem-permissao" | "ok";

export interface PermsSaude {
  sono: boolean;
  treino: boolean;
}

async function permissoesConcedidas(): Promise<PermsSaude> {
  try {
    const granted = await HealthConnect.getGrantedPermissions();
    const read = granted.read ?? [];
    return {
      sono: read.includes("SleepSession"),
      treino: read.includes("ActivitySession"),
    };
  } catch {
    return { sono: false, treino: false };
  }
}

export async function statusSaude(): Promise<StatusSaude> {
  if (!saudeNativa()) return "indisponivel";
  try {
    const { availability } = await HealthConnect.checkAvailability();
    if (availability === "NotSupported") return "indisponivel";
    if (availability === "NotInstalled") return "sem-app";
    const p = await permissoesConcedidas();
    // basta UMA permissão (sono é a principal) para o card funcionar
    return p.sono || p.treino ? "ok" : "sem-permissao";
  } catch {
    return "sem-permissao";
  }
}

export async function pedirPermissoesSaude(): Promise<boolean> {
  if (!saudeNativa()) return false;
  try {
    await HealthConnect.requestPermissions({ read: LEITURA, write: [] });
    const p = await permissoesConcedidas();
    return p.sono || p.treino;
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
  // diagnóstico
  perms: PermsSaude;
  sonoRegistros: number;
  treinoRegistros: number;
  ultimoSonoFim: Date | null; // último sono lido, mesmo que não seja de hoje
  erro: string | null;
}

export async function lerSaudeHoje(): Promise<ResumoSaude> {
  const agora = new Date();
  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);
  // janela ampla pra pegar o sono da noite anterior (até 36h atrás)
  const janelaSono = new Date(agora.getTime() - 36 * 3600 * 1000);

  const perms = await permissoesConcedidas();
  const resumo: ResumoSaude = {
    acordouEm: null,
    sonoMin: 0,
    treinoMin: 0,
    treinoSessoes: 0,
    perms,
    sonoRegistros: 0,
    treinoRegistros: 0,
    ultimoSonoFim: null,
    erro: null,
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
      resumo.erro = `Sono: ${(e as Error)?.message ?? e}`;
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
      const msg = `Treino: ${(e as Error)?.message ?? e}`;
      resumo.erro = resumo.erro ? `${resumo.erro} | ${msg}` : msg;
    }
  }

  return resumo;
}
