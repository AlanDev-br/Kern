"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { getConfig, setConfig } from "./db";
import { montarInstantaneo, aplicarInstantaneo } from "./instantaneo";
import { idAparelho } from "./identidade";
import { hojeChave } from "./dates";

// O backup guardava CINCO tabelas — config, dias, revisoes, dividas e conquistas
// — de vinte e duas. Foi escrito quando o app tinha cinco e nunca acompanhou o
// resto: restaurar apagava todo o historico de treino, as medidas corporais, as
// leituras, as meditacoes, os testes cognitivos e a conversa do coach, sem
// avisar. Backup que perde dado e pior que nenhum, porque o usuario para de
// guardar por outros meios.
//
// Agora o retrato vem de `instantaneo.ts`, que e a mesma fonte usada pela
// sincronia com o desktop. Uma definicao so do que "todos os dados" significa,
// em vez de duas listas que envelhecem em ritmos diferentes.

// Exporta o backup. No Android, escreve arquivo e abre o seletor nativo
// (Drive, WhatsApp...). Na web, dispara download do .json.
export async function exportarBackup(): Promise<void> {
  const payload = await montarInstantaneo(idAparelho());
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

// Importa de uma string JSON, substituindo o estado atual.
//
// Aceita o formato antigo (versao 1, cinco tabelas) alem do completo: quem tem
// um backup guardado de meses atras precisa conseguir restaurar, mesmo que ele
// so traga parte. `aplicarInstantaneo` nao mexe em tabela ausente do arquivo,
// entao restaurar um backup antigo preenche o que ele tem e deixa o resto.
export async function importarBackup(json: string): Promise<void> {
  const bruto = JSON.parse(json) as { versao?: number; tabelas?: unknown };

  if (bruto.versao === 1) {
    // O formato antigo tinha as tabelas soltas na raiz; o novo as agrupa.
    const antigo = bruto as unknown as Record<string, unknown[]>;
    const tabelas: Record<string, unknown[]> = {};
    for (const nome of ["dias", "revisoes", "dividas", "conquistas"]) {
      if (Array.isArray(antigo[nome])) tabelas[nome] = antigo[nome];
    }
    const cfg = (bruto as unknown as { config?: unknown }).config;
    if (cfg) tabelas.config = [cfg];
    await aplicarInstantaneo({
      versao: 2,
      geradoEm: new Date().toISOString(),
      tabelas: tabelas as never,
    });
  } else if (bruto.versao === 2 && bruto.tabelas) {
    await aplicarInstantaneo(bruto as never);
  } else {
    throw new Error("Formato de backup nao reconhecido.");
  }

  // Garante config valida depois da troca.
  await getConfig();
}
