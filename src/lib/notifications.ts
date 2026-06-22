"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { AppConfig } from "./types";
import { getTask } from "./plan-data";

export function ehNativo(): boolean {
  return Capacitor.isNativePlatform();
}

export async function pedirPermissaoNotificacoes(): Promise<boolean> {
  if (!ehNativo()) {
    // Web: usa a Notification API só como fallback informativo.
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const r = await Notification.requestPermission();
      return r === "granted";
    }
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  }
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === "granted";
}

function hm(horario: string): { hour: number; minute: number } {
  const [h, m] = horario.split(":").map(Number);
  return { hour: h, minute: m };
}

// Reagenda todas as notificações locais a partir da config.
// Em horário fixo, recorrente — confiável via AlarmManager no Android.
export async function reagendarNotificacoes(config: AppConfig): Promise<void> {
  if (!ehNativo()) return;

  // limpa as pendentes antes de reagendar
  const pend = await LocalNotifications.getPending();
  if (pend.notifications.length) {
    await LocalNotifications.cancel({ notifications: pend.notifications });
  }

  if (!config.notificacoesAtivas) return;

  const notifs: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
  let id = 1;

  // notificações diárias dos blocos com horário
  const diarias: string[] = [
    "ineg-acordar",
    "ineg-treino",
    "bloco-carreira",
    "ineg-leitura",
    "bloco-telasoff",
  ];
  for (const taskId of diarias) {
    const horario = config.horarios[taskId];
    if (!horario) continue;
    const t = getTask(taskId);
    notifs.push({
      id: id++,
      title: t ? `${t.icone} ${t.titulo}` : "Reconstrução 90",
      body: t?.descricao ?? "Hora de cumprir o plano.",
      schedule: { on: hm(horario), repeats: true, allowWhileIdle: true },
    });
  }

  // semanal: finanças (sábado) — weekday 7
  if (config.horarios["financas"]) {
    notifs.push({
      id: id++,
      title: "💸 Finanças — 30 min",
      body: "Mapeie e revise as dívidas. Fora desse horário, ela não ocupa sua cabeça.",
      schedule: { on: { weekday: 7, ...hm(config.horarios["financas"]) }, repeats: true, allowWhileIdle: true },
    });
  }

  // semanal: revisão (domingo) — weekday 1
  if (config.horarios["revisao"]) {
    notifs.push({
      id: id++,
      title: "📊 Revisão da semana",
      body: "15 min: meça por evidência, não por sentimento.",
      schedule: { on: { weekday: 1, ...hm(config.horarios["revisao"]) }, repeats: true, allowWhileIdle: true },
    });
  }

  if (notifs.length) {
    await LocalNotifications.schedule({ notifications: notifs });
  }
}

// Agenda a notificação diária do coach (direcionamento do dia) num horário fixo.
export async function agendarCoach(corpo: string, horario = "06:45"): Promise<void> {
  if (!ehNativo()) return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 5000,
        title: "🎯 Direcionamento de hoje",
        body: corpo,
        schedule: { on: hm(horario), repeats: true, allowWhileIdle: true },
      },
    ],
  });
}

// Dispara uma notificação de teste em ~8s para validar permissão e entrega.
export async function agendarTeste(): Promise<boolean> {
  const ok = await pedirPermissaoNotificacoes();
  if (!ehNativo() || !ok) return ok;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 9999,
        title: "🔔 Teste do Kern",
        body: "Se você está vendo isto, as notificações estão funcionando!",
        schedule: { at: new Date(Date.now() + 8000), allowWhileIdle: true },
      },
    ],
  });
  return true;
}

// Quantas notificações estão agendadas (diagnóstico).
export async function contarAgendadas(): Promise<number> {
  if (!ehNativo()) return 0;
  try {
    const p = await LocalNotifications.getPending();
    return p.notifications.length;
  } catch {
    return 0;
  }
}
