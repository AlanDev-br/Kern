// Tipos centrais do app "Reconstrução 90"

export type TaskCategory = "inegociavel" | "bloco" | "semanal";

export interface TaskDef {
  id: string;
  titulo: string;
  descricao: string;
  category: TaskCategory;
  xp: number;
  horario?: string; // "HH:MM" — usado para notificações e ordenação
  icone: string; // emoji
}

// Registro de um dia: marca quais tarefas foram cumpridas.
export interface DiaRegistro {
  data: string; // chave "YYYY-MM-DD"
  concluidas: string[]; // ids de TaskDef cumpridas nesse dia
  fechouInegociaveis: boolean; // os 3 inegociáveis cumpridos?
  xp: number; // xp ganho no dia
  acordarManual?: string; // "HH:MM" definido pelo usuário (sobrescreve a estimativa)
  dormirManual?: string; // "HH:MM" que foi dormir na noite anterior (sobrescreve a estimativa)
}

export interface RevisaoSemanal {
  semana: string; // chave "YYYY-Www" (ex: 2026-W26)
  data: string; // data em que foi preenchida
  inegociaveisDias: number; // 0..7
  treinos: number; // 0..7
  diasLeitura: number; // 0..7
  janelaRedeOk: boolean;
  financasOk: boolean;
  nota?: string;
}

export interface Divida {
  id: string;
  nome: string;
  valor: number;
  juros: number; // % ao mês
  vencimento: string; // dia do mês ou data
}

export interface ConquistaDef {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  // avalia se está desbloqueada com base no estado agregado
  condicao: (ctx: ConquistaContexto) => boolean;
}

export interface ConquistaContexto {
  xpTotal: number;
  streakAtual: number;
  melhorStreak: number;
  diasComCheck: number;
  diasFechados: number; // dias com os 3 inegociáveis
  maxTreinosSemana: number;
  maxLeituraSemana: number;
}

export interface ConquistaDesbloqueada {
  id: string;
  data: string;
}

export interface ThemeDef {
  id: string;
  nome: string;
  xpDesbloqueio: number;
  // cores aplicadas como CSS vars
  accent: string;
  accent2: string;
  glow: string;
}

export interface AppConfig {
  id: "singleton";
  dataInicio: string; // "YYYY-MM-DD" — D1 dos 90 dias
  temaAtivo: string;
  horarios: Record<string, string>; // taskId/evento -> "HH:MM"
  notificacoesAtivas: boolean;
  ultimoBackup?: string;
}
