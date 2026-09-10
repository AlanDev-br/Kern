import type { TaskDef, ConquistaDef, ThemeDef } from "./types";

// ─────────────────────────────────────────────────────────────
// Semente do checklist diário
// ─────────────────────────────────────────────────────────────
// Isto é só o ponto de partida da primeira abertura: as tarefas passam a viver
// no IndexedDB e são editáveis, renomeáveis, reordenáveis e removíveis, e as
// notificações leem de lá. Por isso a semente é deliberadamente genérica — o
// horário é um palpite razoável, não uma prescrição, e o texto descreve o
// princípio em vez de contar a rotina de alguém.
//
// `seedTarefasSeNecessario` só roda com a tabela vazia, então mexer aqui não
// altera o checklist de quem já usa o app.

// Os 3 inegociáveis — a espinha do dia. XP alto porque são eles que seguram o
// streak: falhar num deles é o que o dia registra como falta.
export const INEGOCIAVEIS: TaskDef[] = [
  {
    id: "ineg-acordar",
    titulo: "Acordar no horário e começar sem tela",
    descricao:
      "Âncora do resto. Água, luz natural e a cabeça no papel antes do celular — os primeiros minutos sem tela decidem quem manda no seu humor durante o dia.",
    category: "inegociavel",
    xp: 30,
    horario: "07:00",
    icone: "amanhecer",
  },
  {
    id: "ineg-treino",
    titulo: "Movimento do dia (treino ou caminhada)",
    descricao:
      "Não é treinar todo dia. Em dia de descanso, uma caminhada já fecha o inegociável — o que conta é mover o corpo todo dia, sem quebrar o streak.",
    category: "inegociavel",
    xp: 30,
    horario: "07:30",
    icone: "caminhada",
  },
  {
    id: "ineg-leitura",
    titulo: "Leitura no lugar do scroll",
    descricao: "Troca direta: livro pela tela. Ler de propósito, um livro por categoria por vez.",
    category: "inegociavel",
    xp: 30,
    horario: "21:30",
    icone: "leitura",
  },
];

// Blocos da rotina — reforço, XP médio. São os candidatos naturais a serem
// trocados pelos seus: renomeie, mude o horário ou apague o que não for seu.
export const BLOCOS: TaskDef[] = [
  {
    id: "bloco-trabalho",
    titulo: "Bloco de trabalho profundo",
    descricao: "Uma janela sem interrupção na tarefa que mais muda o seu ano. Energia máxima na maior alavanca.",
    category: "bloco",
    xp: 15,
    horario: "09:00",
    icone: "impulso",
  },
  {
    id: "bloco-estudo",
    titulo: "Bloco de estudo",
    descricao: "Horário fixo, para não competir com o trabalho profundo nem sobrar para o fim do dia.",
    category: "bloco",
    xp: 10,
    horario: "11:00",
    icone: "estudo",
  },
  {
    id: "bloco-rede",
    titulo: "Respeitei a janela única de rede",
    descricao: "30–40 min em horário definido. Nunca a primeira nem a última coisa do dia.",
    category: "bloco",
    xp: 10,
    horario: "17:00",
    icone: "semCelular",
  },
  {
    id: "bloco-comer",
    titulo: "Comi de propósito (proteína + sem açúcar de impulso)",
    descricao: "Proteína, fibra e gordura em cada refeição achatam o pico de açúcar. Não pular refeição.",
    category: "bloco",
    xp: 10,
    icone: "refeicao",
  },
  {
    id: "bloco-telasoff",
    titulo: "Telas off no fim da noite",
    descricao: "O sono começa antes de deitar. Sete a nove horas regulam cortisol e humor.",
    category: "bloco",
    xp: 10,
    horario: "22:00",
    icone: "lua",
  },
];

export const TODAS_TAREFAS: TaskDef[] = [...INEGOCIAVEIS, ...BLOCOS];

export function getTask(id: string): TaskDef | undefined {
  return TODAS_TAREFAS.find((t) => t.id === id);
}

// Bônus por fechar os 3 inegociáveis no mesmo dia.
export const BONUS_INEGOCIAVEIS = 30;

// ─────────────────────────────────────────────────────────────
// Frases do diagnóstico — reforço psicológico nos marcos
// ─────────────────────────────────────────────────────────────
export const FRASES_DIAGNOSTICO: string[] = [
  "Valor se constrói para dentro, com prova acumulada de promessa cumprida.",
  "Cada inegociável que você cumpre num dia ruim tira um pouco de poder do mundo externo e devolve pra você.",
  "Não é técnica, é repetição. É isso que mata carência e ansiedade.",
  "Enquanto a fonte estiver fora, qualquer pessoa ou notificação controla seu humor.",
  "A manhã é onde a disciplina é construída.",
  "Você deixa de chegar nas relações precisando e passa a chegar inteiro.",
  "Construa uma vida tão cheia que nenhuma pessoa precise ser seu oxigênio.",
  "O desperdício é o scroll, não o livro.",
  "Resultado de corpo, calma e respeito é consequência — chega sozinho quando a base se mantém.",
  "Não meça por sentimento, meça por evidência.",
  "Dívida mapeada = problema administrável num horário só.",
  "A insegurança diminui à medida que você vê o corpo respondendo à sua consistência.",
];

export function fraseDoMarco(seed: number): string {
  return FRASES_DIAGNOSTICO[seed % FRASES_DIAGNOSTICO.length];
}

// ─────────────────────────────────────────────────────────────
// Conquistas
// ─────────────────────────────────────────────────────────────
export const CONQUISTAS: ConquistaDef[] = [
  {
    id: "primeiro-dia",
    titulo: "Primeiro passo",
    descricao: "Fechou os 3 inegociáveis pela primeira vez.",
    icone: "broto",
    condicao: (c) => c.diasFechados >= 1,
  },
  {
    id: "streak-3",
    titulo: "Pegando ritmo",
    descricao: "3 dias seguidos com os 3 inegociáveis.",
    icone: "chama",
    condicao: (c) => c.melhorStreak >= 3,
  },
  {
    id: "streak-7",
    titulo: "Uma semana inteira",
    descricao: "7 dias seguidos. A base começou a firmar.",
    icone: "raio",
    condicao: (c) => c.melhorStreak >= 7,
  },
  {
    id: "streak-21",
    titulo: "Hábito formado",
    descricao: "21 dias seguidos. Já não é força de vontade, é identidade.",
    icone: "base",
    condicao: (c) => c.melhorStreak >= 21,
  },
  {
    id: "streak-30",
    titulo: "Um mês de prova",
    descricao: "30 dias seguidos. Você virou a evidência.",
    icone: "medalha",
    condicao: (c) => c.melhorStreak >= 30,
  },
  {
    id: "streak-90",
    titulo: "Reconstrução completa",
    descricao: "90 dias seguidos. Outra pessoa.",
    icone: "coroa",
    condicao: (c) => c.melhorStreak >= 90,
  },
  {
    id: "treino-4",
    titulo: "Semana de aço",
    descricao: "4 treinos numa única semana.",
    icone: "treino",
    condicao: (c) => c.maxTreinosSemana >= 4,
  },
  {
    id: "leitura-7",
    titulo: "Leitor constante",
    descricao: "Leu 7 dias numa semana.",
    icone: "leitura",
    condicao: (c) => c.maxLeituraSemana >= 7,
  },
  {
    id: "leitor-atento",
    titulo: "Leitor atento",
    descricao: "Leu pelo menos 10 conceitos na biblioteca.",
    icone: "mente",
    condicao: (c) => c.conceitosLidos >= 10,
  },
  {
    id: "mente-treinada",
    titulo: "Mente treinada",
    descricao: "Completou pelo menos 30 revisões espaçadas.",
    icone: "ciclo",
    condicao: (c) => c.revisoesTotais >= 30,
  },
  {
    id: "xp-500",
    titulo: "500 de prova",
    descricao: "Acumulou 500 XP de promessas cumpridas.",
    icone: "diamante",
    condicao: (c) => c.xpTotal >= 500,
  },
  {
    id: "xp-1500",
    titulo: "Inabalável",
    descricao: "Acumulou 1500 XP.",
    icone: "escudo",
    condicao: (c) => c.xpTotal >= 1500,
  },
];

// ─────────────────────────────────────────────────────────────
// Temas desbloqueáveis (por XP acumulado)
// ─────────────────────────────────────────────────────────────
export const TEMAS: ThemeDef[] = [
  {
    id: "esmeralda",
    nome: "Esmeralda",
    xpDesbloqueio: 0,
    accent: "#22c55e",
    accent2: "#10b981",
    glow: "34, 197, 94",
  },
  {
    id: "oceano",
    nome: "Oceano",
    xpDesbloqueio: 200,
    accent: "#38bdf8",
    accent2: "#0ea5e9",
    glow: "56, 189, 248",
  },
  {
    id: "violeta",
    nome: "Violeta",
    xpDesbloqueio: 500,
    accent: "#a78bfa",
    accent2: "#8b5cf6",
    glow: "167, 139, 250",
  },
  {
    id: "ambar",
    nome: "Âmbar",
    xpDesbloqueio: 1000,
    accent: "#fbbf24",
    accent2: "#f59e0b",
    glow: "251, 191, 36",
  },
  {
    id: "rubi",
    nome: "Rubi",
    xpDesbloqueio: 1800,
    accent: "#fb7185",
    accent2: "#f43f5e",
    glow: "251, 113, 133",
  },
  {
    id: "aurora",
    nome: "Aurora",
    xpDesbloqueio: 3000,
    accent: "#34d399",
    accent2: "#a78bfa",
    glow: "52, 211, 153",
  },
];

export function getTema(id: string): ThemeDef {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0];
}
