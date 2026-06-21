"use client";

import { Capacitor } from "@capacitor/core";
import { HealthConnect } from "@devmaxime/capacitor-health-connect";

const LEITURA: ("SleepSession" | "ActivitySession")[] = ["SleepSession", "ActivitySession"];

export function saudeNativa(): boolean {
  return Capacitor.isNativePlatform();
}

export type StatusSaude = "indisponivel" | "sem-app" | "sem-permissao" | "ok";

export async function statusSaude(): Promise<StatusSaude> {
  if (!saudeNativa()) return "indisponivel";
  try {
    const { availability } = await HealthConnect.checkAvailability();
    if (availability === "NotSupported") return "indisponivel";
    if (availability === "NotInstalled") return "sem-app";
    const granted = await HealthConnect.getGrantedPermissions();
    const ok = LEITURA.every((t) => granted.read.includes(t));
    return ok ? "ok" : "sem-permissao";
  } catch {
    return "sem-permissao";
  }
}

export async function pedirPermissoesSaude(): Promise<boolean> {
  if (!saudeNativa()) return false;
  try {
    const r = await HealthConnect.requestPermissions({ read: LEITURA, write: [] });
    return LEITURA.every((t) => r.read.includes(t));
  } catch {
    return false;
  }
}

// extrai um ISO de campos possíveis do registro nativo
function lerInstante(rec: Record<string, unknown>, ...chaves: string[]): Date | null {
  for (const k of chaves) {
    const v = rec[k];
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function ehHoje(d: Date): boolean {
  const h = new Date();
  return (
    d.getFullYear() === h.getFullYear() &&
    d.getMonth() === h.getMonth() &&
    d.getDate() === h.getDate()
  );
}

export interface ResumoSaude {
  acordouEm: Date | null; // fim do último sono que terminou hoje
  sonoMin: number;
  treinoMin: number;
  treinoSessoes: number;
}

export async function lerSaudeHoje(): Promise<ResumoSaude> {
  const agora = new Date();
  const inicioDia = new Date(agora);
  inicioDia.setHours(0, 0, 0, 0);
  // sono começa na noite anterior — busca a partir de 18h antes
  const inicioSono = new Date(inicioDia.getTime() - 18 * 3600 * 1000);

  const resumo: ResumoSaude = {
    acordouEm: null,
    sonoMin: 0,
    treinoMin: 0,
    treinoSessoes: 0,
  };

  // ── Sono ──
  try {
    const { records } = await HealthConnect.readRecords({
      type: "SleepSession",
      start: inicioSono.toISOString(),
      end: agora.toISOString(),
    });
    let melhorFim: Date | null = null;
    let inicioCorrespondente: Date | null = null;
    for (const r of records as Record<string, unknown>[]) {
      const fim = lerInstante(r, "endTime", "endDate", "end");
      const ini = lerInstante(r, "startTime", "startDate", "start");
      if (fim && ehHoje(fim) && (!melhorFim || fim > melhorFim)) {
        melhorFim = fim;
        inicioCorrespondente = ini;
      }
    }
    if (melhorFim) {
      resumo.acordouEm = melhorFim;
      if (inicioCorrespondente) {
        resumo.sonoMin = Math.round((melhorFim.getTime() - inicioCorrespondente.getTime()) / 60000);
      }
    }
  } catch {
    /* sem dados de sono */
  }

  // ── Exercício ──
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
  } catch {
    /* sem dados de exercício */
  }

  return resumo;
}
