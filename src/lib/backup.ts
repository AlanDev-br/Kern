"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { db, getConfig, setConfig } from "./db";
import { hojeChave } from "./dates";

interface BackupPayload {
  versao: 1;
  exportadoEm: string;
  config: unknown;
  dias: unknown[];
  revisoes: unknown[];
  dividas: unknown[];
  conquistas: unknown[];
}

async function montarPayload(): Promise<BackupPayload> {
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    config: await db.config.get("singleton"),
    dias: await db.dias.toArray(),
    revisoes: await db.revisoes.toArray(),
    dividas: await db.dividas.toArray(),
    conquistas: await db.conquistas.toArray(),
  };
}

// Exporta o backup. No Android, escreve arquivo e abre o seletor nativo
// (Drive, WhatsApp...). Na web, dispara download do .json.
export async function exportarBackup(): Promise<void> {
  const payload = await montarPayload();
  const json = JSON.stringify(payload, null, 2);
  const nome = `reconstrucao90-backup-${hojeChave()}.json`;

  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: nome,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Backup Reconstrução 90",
      text: "Seu progresso dos 90 dias",
      url: res.uri,
      dialogTitle: "Salvar backup (Drive, WhatsApp...)",
    });
  } else {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  await setConfig({ ultimoBackup: hojeChave() });
}

// Importa de uma string JSON, sobrescrevendo o estado atual.
export async function importarBackup(json: string): Promise<void> {
  const payload = JSON.parse(json) as BackupPayload;
  if (payload.versao !== 1) throw new Error("Versão de backup incompatível");

  await db.transaction("rw", db.config, db.dias, db.revisoes, db.dividas, db.conquistas, async () => {
    await Promise.all([
      db.dias.clear(),
      db.revisoes.clear(),
      db.dividas.clear(),
      db.conquistas.clear(),
    ]);
    if (payload.config) await db.config.put(payload.config as never);
    if (payload.dias?.length) await db.dias.bulkPut(payload.dias as never[]);
    if (payload.revisoes?.length) await db.revisoes.bulkPut(payload.revisoes as never[]);
    if (payload.dividas?.length) await db.dividas.bulkPut(payload.dividas as never[]);
    if (payload.conquistas?.length) await db.conquistas.bulkPut(payload.conquistas as never[]);
  });

  // garante config válida
  await getConfig();
}
