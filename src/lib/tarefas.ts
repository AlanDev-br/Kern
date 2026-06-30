"use client";

import { db, type TarefaReg } from "./db";
import type { TaskCategory, TaskDef } from "./types";

// Camada de acesso ao checklist editável. As tarefas vivem no IndexedDB e são
// ordenadas por `ordem` (e, como desempate, pelo título) para uma exibição estável.

export async function listarTarefas(): Promise<TarefaReg[]> {
  const todas = await db.tarefas.toArray();
  return todas.sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
}

// Próximo valor de ordem (vai para o fim da lista).
async function proximaOrdem(): Promise<number> {
  const todas = await db.tarefas.toArray();
  return todas.reduce((m, t) => Math.max(m, t.ordem), -1) + 1;
}

// Gera um id estável a partir do título; mantém o padrão "kebab" dos ids
// semeados e garante unicidade com um sufixo curto.
function novoId(titulo: string): string {
  const slug = titulo
    .toLowerCase()
    .normalize("NFD") // separa acentos para removê-los (faixa combinante abaixo)
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
  const sufixo = Math.random().toString(36).slice(2, 6);
  return `tarefa-${slug || "nova"}-${sufixo}`;
}

export interface NovaTarefa {
  titulo: string;
  descricao: string;
  category: TaskCategory;
  xp: number;
  horario?: string;
  icone: string;
}

export async function criarTarefa(dados: NovaTarefa): Promise<TarefaReg> {
  const reg: TarefaReg = {
    ...dados,
    id: novoId(dados.titulo),
    ordem: await proximaOrdem(),
    horario: dados.horario || undefined, // "" → sem notificação
  };
  await db.tarefas.put(reg);
  return reg;
}

// Atualiza campos editáveis de uma tarefa existente (id e ordem preservados).
export async function editarTarefa(
  id: string,
  patch: Partial<Omit<TaskDef, "id">>,
): Promise<void> {
  const atual = await db.tarefas.get(id);
  if (!atual) return;
  await db.tarefas.put({ ...atual, ...patch, id });
}

export async function removerTarefa(id: string): Promise<void> {
  await db.tarefas.delete(id);
}

// Reordena segundo a sequência de ids recebida (índice vira `ordem`).
export async function reordenarTarefas(idsEmOrdem: string[]): Promise<void> {
  const todas = await db.tarefas.toArray();
  const mapa = new Map(todas.map((t) => [t.id, t]));
  const atualizadas: TarefaReg[] = [];
  idsEmOrdem.forEach((id, i) => {
    const t = mapa.get(id);
    if (t) atualizadas.push({ ...t, ordem: i });
  });
  if (atualizadas.length) await db.tarefas.bulkPut(atualizadas);
}
