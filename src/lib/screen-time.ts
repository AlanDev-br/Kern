"use client";

import { registerPlugin, Capacitor } from "@capacitor/core";
import { APPS_SOCIAIS } from "./social-apps";

interface UsageApp {
  packageName: string;
  totalMs: number;
}

interface ScreenTimePlugin {
  hasPermission(): Promise<{ granted: boolean; mode?: number }>;
  requestPermission(): Promise<void>;
  getTodayUsage(): Promise<{ apps: UsageApp[] }>;
}

const ScreenTime = registerPlugin<ScreenTimePlugin>("ScreenTime");

export function tempoTelaDisponivel(): boolean {
  return Capacitor.isNativePlatform();
}

export async function permissaoDetalhe(): Promise<{ granted: boolean; mode: number }> {
  if (!tempoTelaDisponivel()) return { granted: false, mode: -1 };
  try {
    const r = await ScreenTime.hasPermission();
    return { granted: r.granted, mode: r.mode ?? -1 };
  } catch {
    return { granted: false, mode: -1 };
  }
}

export async function temPermissaoTempoTela(): Promise<boolean> {
  return (await permissaoDetalhe()).granted;
}

export async function pedirPermissaoTempoTela(): Promise<void> {
  if (!tempoTelaDisponivel()) return;
  await ScreenTime.requestPermission();
}

export interface UsoApp {
  pkg: string;
  nome: string;
  icone: string;
  minutos: number;
}

export interface UsoSocial {
  totalMin: number;
  apps: UsoApp[];
}

export async function usoSocialHoje(): Promise<UsoSocial> {
  const { apps } = await ScreenTime.getTodayUsage();
  const porPkg = new Map(apps.map((a) => [a.packageName, a.totalMs]));

  const lista: UsoApp[] = APPS_SOCIAIS.map((a) => ({
    pkg: a.pkg,
    nome: a.nome,
    icone: a.icone,
    minutos: Math.round((porPkg.get(a.pkg) ?? 0) / 60000),
  }))
    .filter((a) => a.minutos > 0)
    .sort((a, b) => b.minutos - a.minutos);

  return {
    totalMin: lista.reduce((s, a) => s + a.minutos, 0),
    apps: lista,
  };
}
