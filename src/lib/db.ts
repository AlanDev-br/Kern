import Dexie, { type Table } from "dexie";
import type {
  DiaRegistro,
  RevisaoSemanal,
  Divida,
  ConquistaDesbloqueada,
  AppConfig,
} from "./types";
// CartaoLeitura é definido neste módulo (abaixo) e re-exportado para o restante.
import { hojeChave } from "./dates";

// Guarda o GLB do avatar (Blob) no próprio IndexedDB → render offline.
export interface AvatarRegistro {
  id: string; // "glb"
  blob: Blob;
  criadoEm: string;
}

// Treino de musculação (substitui o Hevy). Sessão com exercícios e séries.
export interface SetReg {
  peso: number;
  reps: number;
  tipo?: string; // normal, warmup, falha...
}
export interface ExercicioReg {
  nome: string;
  sets: SetReg[];
}
export interface Treino {
  id: string; // inicio ISO (único por sessão)
  titulo: string;
  inicio: string; // ISO
  fim?: string;
  exercicios: ExercicioReg[];
}
// Série em edição durante o treino (inclui o estado "feito" do checkbox).
export interface SetRascunho {
  peso: number;
  reps: number;
  tipo?: string;
  feito?: boolean;
}
// Treino em andamento, salvo continuamente para sobreviver a um reinício do app
// (Android pode encerrar o app em segundo plano por pressão de memória). Linha
// única, id fixo "atual".
export interface TreinoRascunho {
  id: "atual";
  titulo: string;
  inicio: string; // ISO — preserva o cronômetro ao retomar
  exercicios: { nome: string; sets: SetRascunho[] }[];
  atualizadoEm: string; // ISO
}
export interface Rotina {
  id: string;
  nome: string;
  exercicios: { nome: string; series: number }[];
}

// Imagem (URL) associada a um exercício — sugerida automaticamente ou definida
// pelo usuário; cacheada para não buscar de novo.
export interface ImagemExercicio {
  nome: string; // chave = nome do exercício
  url: string;
}

// Cartão da Biblioteca: um conceito de livro para ler e internalizar via
// repetição espaçada. Pode ser "curado" (semeado pelo app) ou "meu" (trecho que
// o próprio usuário marcou e adicionou). Cada cartão carrega seu estado de
// agendamento (caixa de Leitner + próxima revisão).
export interface CartaoLeitura {
  id: string; // slug (curados) | uuid (meus)
  origem: "curado" | "meu";
  livro: string;
  autor: string;
  tema: string;
  titulo: string;
  ideia: string; // conceito distilado (curados) ou a nota do usuário
  citacao?: string; // citação curta atribuída (curados) | trecho marcado pelo usuário
  aplicacao?: string; // como aplicar hoje
  pergunta?: string; // prompt usado na revisão
  dificuldade?: string; // dificuldade-alvo (ex.: "impulsividade")
  caixa: number; // caixa de Leitner 0..5
  proximaRevisao: string; // "YYYY-MM-DD"
  ultimaRevisao?: string;
  revisoes: number; // quantas vezes já foi revisado
  lido: boolean; // já foi lido a 1ª vez?
  criadoEm: string;
}

// Banco local-first. Tudo vive no IndexedDB do dispositivo.
export class Reconstrucao90DB extends Dexie {
  dias!: Table<DiaRegistro, string>;
  revisoes!: Table<RevisaoSemanal, string>;
  dividas!: Table<Divida, string>;
  conquistas!: Table<ConquistaDesbloqueada, string>;
  config!: Table<AppConfig, string>;
  avatar!: Table<AvatarRegistro, string>;
  treinos!: Table<Treino, string>;
  rotinas!: Table<Rotina, string>;
  exImagens!: Table<ImagemExercicio, string>;
  leituras!: Table<CartaoLeitura, string>;
  rascunhoTreino!: Table<TreinoRascunho, string>;

  constructor() {
    super("reconstrucao90");
    this.version(1).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
    });
    this.version(2).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
      avatar: "id",
    });
    this.version(3).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
      avatar: "id",
      treinos: "id, inicio",
      rotinas: "id",
    });
    this.version(4).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
      avatar: "id",
      treinos: "id, inicio",
      rotinas: "id",
      exImagens: "nome",
    });
    this.version(5).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
      avatar: "id",
      treinos: "id, inicio",
      rotinas: "id",
      exImagens: "nome",
      leituras: "id, proximaRevisao, origem",
    });
    this.version(6).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
      avatar: "id",
      treinos: "id, inicio",
      rotinas: "id",
      exImagens: "nome",
      leituras: "id, proximaRevisao, origem",
      rascunhoTreino: "id",
    });
  }
}

export const db = new Reconstrucao90DB();

export const CONFIG_PADRAO: AppConfig = {
  id: "singleton",
  dataInicio: hojeChave(),
  temaAtivo: "esmeralda",
  notificacoesAtivas: true,
  horarios: {
    "ineg-acordar": "06:30",
    "ineg-treino": "07:15",
    "bloco-carreira": "08:30",
    "ineg-leitura": "21:30",
    "bloco-telasoff": "22:00",
    "financas": "10:00", // sábado
    "revisao": "19:00", // domingo
  },
};

export async function getConfig(): Promise<AppConfig> {
  const c = await db.config.get("singleton");
  if (c) return c;
  await db.config.put(CONFIG_PADRAO);
  return CONFIG_PADRAO;
}

export async function setConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  const atual = await getConfig();
  const novo = { ...atual, ...patch, id: "singleton" as const };
  await db.config.put(novo);
  return novo;
}

export async function getDia(data: string): Promise<DiaRegistro> {
  const d = await db.dias.get(data);
  return d ?? { data, concluidas: [], fechouInegociaveis: false, xp: 0 };
}

export async function salvarDia(dia: DiaRegistro): Promise<void> {
  await db.dias.put(dia);
}

export async function getTodosDias(): Promise<DiaRegistro[]> {
  return db.dias.toArray();
}
