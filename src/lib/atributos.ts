import type { ConquistaContexto } from "./types";

// Painel de atributos estilo RPG (Solo Leveling). Cada atributo é DERIVADO dos
// dados que o app já registra — sobe sozinho conforme o Alan cumpre objetivos.
// `valor` 0..100 alimenta o radar; `nivel` 0..10 é o valor/10.

export interface Atributo {
  id: string;
  nome: string;
  icone: string;
  valor: number; // 0..100
  nivel: number; // 0..10
  fonte: string; // o que faz subir
}

export interface EntradaAtributos {
  ctx: ConquistaContexto;
  xpForca: number;
  cardioMin: number; // total de minutos de cardio
  treinosCount: number;
  menteScore: number; // 0..100 (módulo Mente)
}

// Curva suave: muitos pontos se aproximam de 100 sem nunca travar a evolução.
function curva(pontos: number, escala: number): number {
  return Math.round(100 * (1 - Math.exp(-Math.max(0, pontos) / escala)));
}

export function calcularAtributos(e: EntradaAtributos): Atributo[] {
  const { ctx, xpForca, cardioMin, treinosCount, menteScore } = e;

  // Os seis atributos tinham seis cores neon diferentes — rosa, azul, verde,
  // roxo, laranja, cinza — e nenhuma delas codificava nada: Forca nao e mais
  // 'vermelha' que Foco. Era arco-iris decorativo num painel onde o dado ja
  // esta no comprimento da barra e no numero do nivel. A cor saiu; quem
  // carrega a informacao continua carregando.
  const defs: { id: string; nome: string; icone: string; pontos: number; escala: number; fonte: string }[] = [
    {
      id: "forca",
      nome: "Força",
      icone: "treino",
      pontos: xpForca + treinosCount * 8,
      escala: 500,
      fonte: "Musculação: volume, séries e recordes",
    },
    {
      id: "agilidade",
      nome: "Agilidade",
      icone: "corrida",
      pontos: cardioMin * 1.5,
      escala: 300,
      fonte: "Cardio e movimento diário",
    },
    {
      id: "vitalidade",
      nome: "Vitalidade",
      icone: "coracao",
      pontos: ctx.streakAtual * 6 + ctx.diasComCheck * 2,
      escala: 400,
      fonte: "Streak e consistência (sono quando disponível)",
    },
    {
      id: "inteligencia",
      nome: "Inteligência",
      icone: "mente",
      pontos: ctx.conceitosLidos * 12 + ctx.revisoesTotais * 4 + menteScore * 5,
      escala: 500,
      fonte: "Leitura, estudo e testes da Mente",
    },
    {
      id: "foco",
      nome: "Foco",
      icone: "alvo",
      pontos: ctx.diasFechados * 8 + ctx.melhorStreak * 5,
      escala: 400,
      fonte: "Inegociáveis fechados e anti-dopamina",
    },
    {
      id: "espirito",
      nome: "Espírito",
      icone: "meditacao",
      pontos: ctx.revisoesTotais * 6 + ctx.conceitosLidos * 3,
      escala: 300,
      fonte: "Diário Estoico e revisões",
    },
  ];

  return defs.map((d) => {
    const valor = curva(d.pontos, d.escala);
    return {
      id: d.id,
      nome: d.nome,
      icone: d.icone,
      valor,
      nivel: Math.floor(valor / 10),
      fonte: d.fonte,
    };
  });
}

// "Nível de caçador" geral — média dos atributos vira uma classe (eco do rank).
export function classeGeral(atributos: Atributo[]): { media: number; titulo: string } {
  const media = Math.round(atributos.reduce((s, a) => s + a.valor, 0) / atributos.length);
  const titulo =
    media >= 85 ? "Monarca" :
    media >= 70 ? "Rank S" :
    media >= 55 ? "Rank A" :
    media >= 40 ? "Rank B" :
    media >= 25 ? "Rank C" :
    media >= 12 ? "Rank D" : "Rank E";
  return { media, titulo };
}
