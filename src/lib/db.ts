import Dexie, { type Table } from "dexie";
import type {
  DiaRegistro,
  RevisaoSemanal,
  Divida,
  ConquistaDesbloqueada,
  AppConfig,
  TaskDef,
} from "./types";
// CartaoLeitura é definido neste módulo (abaixo) e re-exportado para o restante.
import { hojeChave } from "./dates";
import type { MedidaCorporal } from "./composicao";
// Só os tipos: `kern-health` importa este módulo de volta, e um import de valor
// fecharia o ciclo. `import type` some na compilação.
import type { AmostraSaude, EstadoSincronia } from "./kern-health";

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
  rir?: number;  // repetições em reserva (0..4, etc)
}
export interface ExercicioReg {
  nome: string;
  sets: SetReg[];
  observacoes?: string;
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
  rir?: number;
}

export interface MensagemCoach {
  id?: number;
  role: "user" | "assistant";
  content: string;
  data: string; // data/hora de envio (ISO)
}

export interface MeditacaoSession {
  id?: number;
  tipo: "meditacao" | "foco";
  minutos: number;
  data: string; // formato "YYYY-MM-DD"
  xp: number;
  criadoEm: string; // ISO
}
// Treino em andamento, salvo continuamente para sobreviver a um reinício do app
// (Android pode encerrar o app em segundo plano por pressão de memória). Linha
// única, id fixo "atual".
export interface TreinoRascunho {
  id: "atual";
  titulo: string;
  inicio: string; // ISO — preserva o cronômetro ao retomar
  exercicios: { nome: string; sets: SetRascunho[]; observacoes?: string }[];
  atualizadoEm: string; // ISO
}
export interface Rotina {
  id: string;
  nome: string;
  exercicios: { nome: string; series: number }[];
}

// Configuração individualizada por exercício (descanso padrão, observações gerais).
export interface ExercicioConfig {
  nome: string; // chave primária = nome do exercício
  descansoAlvo?: number; // em segundos
  observacaoGeral?: string; // notas permanentes
}

// Imagem (URL) associada a um exercício — sugerida automaticamente ou definida
// pelo usuário; cacheada para não buscar de novo.
export interface ImagemExercicio {
  nome: string; // chave = nome do exercício
  url: string;
}

// Auto-avaliação das múltiplas inteligências (Gardner + emocional). Guarda um
// snapshot por vez que o usuário refaz, pra ver evolução ao longo do tempo.
export interface AvaliacaoMente {
  id?: number;
  data: string; // ISO
  scores: Record<string, number>; // id da inteligência → 0..100
}

// Resultado de um mini-teste cognitivo (memória de trabalho, reação, atenção).
// Mantém o histórico pra mostrar tendência. `valor` é a métrica bruta do teste;
// `score` é normalizado 0..100 pra alimentar o atributo Inteligência.
export interface ResultadoCognitivo {
  id?: number;
  data: string; // ISO
  tipo: "reacao" | "digitos" | "stroop";
  valor: number; // ms (reação) | dígitos (span) | acertos/seg (stroop)
  score: number; // 0..100
}

// Tarefa do checklist diário, agora editável pelo usuário. Os valores iniciais
// (3 inegociáveis + blocos) são semeados a partir de plan-data; daí em diante o
// usuário pode criar, editar, remover e reordenar. `ordem` controla a exibição.
export interface TarefaReg extends TaskDef {
  ordem: number;
}

export interface CardioRegistro {
  id: string; // ID único do Health Connect ou UUID aleatório (manual)
  tipo: string; // "Corrida" | "Caminhada" | "Bicicleta" | "Elíptico" | "Outro"
  minutos: number;
  data: string; // formato "YYYY-MM-DD"
  origem: "health_connect" | "manual";
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
  cardios!: Table<CardioRegistro, string>;
  tarefas!: Table<TarefaReg, string>;
  avaliacoesMente!: Table<AvaliacaoMente, number>;
  testesCognitivos!: Table<ResultadoCognitivo, number>;
  exercicioConfigs!: Table<ExercicioConfig, string>;
  conversasCoach!: Table<MensagemCoach, number>;
  meditacoes!: Table<MeditacaoSession, number>;
  medidasCorporais!: Table<MedidaCorporal, string>;
  saudeAmostras!: Table<AmostraSaude, string>;
  saudeSync!: Table<EstadoSincronia, string>;

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
    this.version(7).stores({
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
      cardios: "id, data, origem",
    });
    this.version(8).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
    });
    this.version(9).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
      avaliacoesMente: "++id, data",
      testesCognitivos: "++id, data, tipo",
    });
    this.version(10).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
      avaliacoesMente: "++id, data",
      testesCognitivos: "++id, data, tipo",
      exercicioConfigs: "nome",
    });
    this.version(11).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
      avaliacoesMente: "++id, data",
      testesCognitivos: "++id, data, tipo",
      exercicioConfigs: "nome",
      conversasCoach: "++id, data",
      meditacoes: "++id, data",
    });
    // v12 — pesagens da balança. Guarda o bruto (peso + impedância); as métricas
    // de composição são derivadas em `composicao.ts`, nunca gravadas.
    this.version(12).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
      avaliacoesMente: "++id, data",
      testesCognitivos: "++id, data, tipo",
      exercicioConfigs: "nome",
      conversasCoach: "++id, data",
      meditacoes: "++id, data",
      medidasCorporais: "id, data, origem",
    });

    // v13 — pipeline de saúde da Mi Band 10.
    //
    // `saudeAmostras` guarda o registro do Health Connect como ele chegou, no
    // envelope uniforme do plugin: nada de consolidado aqui. O índice composto
    // [tipo+data] existe porque toda leitura da tela é "este tipo, neste
    // intervalo" — sem ele, cada painel varre a tabela inteira.
    //
    // `saudeSync` guarda o estado da última leitura de cada tipo. Sem isso, "a
    // Xiaomi não publica isso" e "eu não consegui ler" aparecem iguais na tela: um
    // é fato sobre o aparelho, o outro é bug nosso.
    this.version(13).stores({
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
      cardios: "id, data, origem",
      tarefas: "id, ordem, category",
      avaliacoesMente: "++id, data",
      testesCognitivos: "++id, data, tipo",
      exercicioConfigs: "nome",
      conversasCoach: "++id, data",
      meditacoes: "++id, data",
      medidasCorporais: "id, data, origem",
      saudeAmostras: "id, tipo, data, [tipo+data], origem, inicio",
      saudeSync: "tipo",
    });
  }
}

export const db = new Reconstrucao90DB();

export const CONFIG_PADRAO: AppConfig = {
  id: "singleton",
  dataInicio: hojeChave(),
  temaAtivo: "esmeralda",
  notificacoesAtivas: true,
  // Só as rotinas semanais, que não são tarefas do checklist. O horário de cada
  // tarefa mora na própria tarefa; semear uma entrada aqui congelaria o horário
  // de quem semeou, porque a config vence a tarefa na hora de agendar.
  horarios: {
    financas: "10:00", // sábado
    revisao: "19:00", // domingo
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

/**
 * Grava uma pesagem. A balança repete a leitura várias vezes enquanto a pessoa
 * está em cima dela, e o `id` (instante ISO) evita duplicar a mesma medição.
 * Mais de uma pesagem no mesmo dia é permitida de propósito — a de manhã e a da
 * noite contam histórias diferentes, e é a média móvel que suaviza isso.
 */
export async function salvarMedida(m: MedidaCorporal): Promise<void> {
  await db.medidasCorporais.put(m);
}

export async function getMedidas(): Promise<MedidaCorporal[]> {
  return db.medidasCorporais.orderBy("data").toArray();
}

/** Última pesagem registrada, de qualquer origem. */
export async function getUltimaMedida(): Promise<MedidaCorporal | undefined> {
  const todas = await db.medidasCorporais.orderBy("id").reverse().limit(1).toArray();
  return todas[0];
}
