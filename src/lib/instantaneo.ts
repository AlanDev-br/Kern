"use client";

import { db } from "./db";

// ─────────────────────────────────────────────────────────────
// Instantâneo do banco inteiro
// ─────────────────────────────────────────────────────────────
// Um retrato de tudo que o app guarda, em JSON. Serve a dois usos que sempre
// foram o mesmo problema: o backup manual e a cópia do celular para o desktop.
//
// Existe porque o backup anterior cobria CINCO tabelas — config, dias,
// revisoes, dividas e conquistas — de vinte e duas. Ele foi escrito quando o
// app tinha cinco e nunca acompanhou o resto. Restaurar aquele backup apagava
// todo o histórico de treino, as medidas corporais, as leituras, as meditações,
// os testes cognitivos e a conversa do coach, sem avisar. Backup que perde dado
// é pior que nenhum, porque o usuário para de guardar por outros meios.

/**
 * As tabelas que entram no instantâneo, e a razão de cada ausência.
 *
 * Fora ficam só as que não fazem sentido atravessar ou não sobrevivem a JSON:
 *
 * - `avatar` e `exImagens` guardam Blob. `JSON.stringify` de um Blob devolve
 *   `{}` — perda silenciosa, que é o pior tipo. Ficam de fora explicitamente,
 *   e não por esquecimento.
 * - `rascunhoTreino` é o treino em andamento, do aparelho que está na academia.
 * - `saudeSync` é o estado da leitura do Health Connect, e só o celular tem
 *   pulseira.
 */
export const TABELAS_INSTANTANEO = [
  "config",
  "dias",
  "revisoes",
  "dividas",
  "conquistas",
  "treinos",
  "rotinas",
  "leituras",
  "cardios",
  "tarefas",
  "avaliacoesMente",
  "testesCognitivos",
  "exercicioConfigs",
  "conversasCoach",
  "meditacoes",
  "medidasCorporais",
  "saudeAmostras",
  "pareceres",
] as const;

export type TabelaInstantaneo = (typeof TABELAS_INSTANTANEO)[number];

export interface Instantaneo {
  /** 2 é o formato completo. 1 era o backup de cinco tabelas. */
  versao: 2;
  geradoEm: string;
  /** De qual aparelho veio, para a tela poder dizer. */
  aparelho?: string;
  tabelas: Partial<Record<TabelaInstantaneo, unknown[]>>;
}

export async function montarInstantaneo(aparelho?: string): Promise<Instantaneo> {
  const tabelas: Partial<Record<TabelaInstantaneo, unknown[]>> = {};
  for (const nome of TABELAS_INSTANTANEO) {
    try {
      tabelas[nome] = await (db as unknown as Record<string, { toArray(): Promise<unknown[]> }>)[nome].toArray();
    } catch {
      // Tabela que ainda não existe nesta versão do banco não impede o retrato
      // das outras. Um instantâneo parcial vale mais que nenhum.
      tabelas[nome] = [];
    }
  }
  return { versao: 2, geradoEm: new Date().toISOString(), aparelho, tabelas };
}

export interface ResumoInstantaneo {
  tabela: string;
  registros: number;
}

/** Quantos registros o instantâneo traz por tabela, para a tela poder mostrar. */
export function resumir(inst: Instantaneo): ResumoInstantaneo[] {
  return TABELAS_INSTANTANEO.map((t) => ({ tabela: t, registros: inst.tabelas[t]?.length ?? 0 })).filter(
    (r) => r.registros > 0,
  );
}

/**
 * Substitui o conteúdo local pelo do instantâneo.
 *
 * É substituição, não fusão, e de propósito: o desktop é espelho do celular, e
 * espelho que discute com a fonte deixa de ser espelho. A fusão existe em
 * `sincronia-fusao.ts` para quando os dois lados puderem editar.
 *
 * Tudo numa transação só: se qualquer tabela falhar, nenhuma é alterada. Sem
 * isso, uma falha no meio deixaria metade do banco novo e metade velho, que é
 * um estado que ninguém sabe consertar.
 */
export async function aplicarInstantaneo(inst: Instantaneo): Promise<ResumoInstantaneo[]> {
  if (inst.versao !== 2 && (inst as { versao: number }).versao !== 1) {
    throw new Error(`Formato de instantâneo desconhecido: ${(inst as { versao: unknown }).versao}`);
  }

  const presentes = TABELAS_INSTANTANEO.filter(
    (t) => (db as unknown as Record<string, unknown>)[t] !== undefined,
  );
  const stores = presentes.map((t) => (db as unknown as Record<string, never>)[t]);

  await db.transaction("rw", stores, async () => {
    for (const nome of presentes) {
      const linhas = inst.tabelas[nome];
      if (!linhas) continue; // ausente no instantâneo: não mexe na local
      const tabela = (db as unknown as Record<string, {
        clear(): Promise<void>;
        bulkPut(v: unknown[]): Promise<unknown>;
      }>)[nome];
      await tabela.clear();
      if (linhas.length) await tabela.bulkPut(linhas);
    }
  });

  return resumir(inst);
}
