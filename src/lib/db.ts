import Dexie, { type Table } from "dexie";
import type {
  DiaRegistro,
  RevisaoSemanal,
  Divida,
  ConquistaDesbloqueada,
  AppConfig,
} from "./types";
import { hojeChave } from "./dates";

// Banco local-first. Tudo vive no IndexedDB do dispositivo.
export class Reconstrucao90DB extends Dexie {
  dias!: Table<DiaRegistro, string>;
  revisoes!: Table<RevisaoSemanal, string>;
  dividas!: Table<Divida, string>;
  conquistas!: Table<ConquistaDesbloqueada, string>;
  config!: Table<AppConfig, string>;

  constructor() {
    super("reconstrucao90");
    this.version(1).stores({
      dias: "data",
      revisoes: "semana",
      dividas: "id",
      conquistas: "id",
      config: "id",
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
