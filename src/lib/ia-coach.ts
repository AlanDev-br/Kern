"use client";

import { Capacitor, CapacitorHttp } from "@capacitor/core";

// ─────────────────────────────────────────────────────────────
// Coach de IA do Kern. Usa Groq (rápido e com camada gratuita),
// compatível com a API da OpenAI. A "inteligência de domínio" vive
// na BASE_CONHECIMENTO abaixo — princípios fundamentados que o
// modelo deve seguir, escritos no código (não dependem da rede).
// O coach age sobre os DADOS REAIS do usuário (montarContexto).
// ─────────────────────────────────────────────────────────────

export const MODELOS_GROQ = [
  { id: "llama-3.3-70b-versatile", nome: "Llama 3.3 70B (recomendado)" },
  { id: "llama-3.1-8b-instant", nome: "Llama 3.1 8B (mais rápido)" },
];

// Chave/modelo vindos do .env.local (embutidos no build). Se preenchidos, o coach
// ativa sozinho, sem precisar colar nada na tela.
export const CHAVE_AMBIENTE = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "";
export const MODELO_AMBIENTE = process.env.NEXT_PUBLIC_GROQ_MODELO ?? "";

// Conhecimento fundamentado embutido. Denso de propósito — é o "treinamento"
// do coach. Atualize aqui para refinar a conduta dele.
const BASE_CONHECIMENTO = `
PRINCÍPIOS DE TREINO NATURAL (hipertrofia, sem anabolizantes):
- Volume é o principal motor: ~10–20 séries efetivas por grupo muscular por semana (MEV ~8, faixa ótima 12–18, MRV ~20). Acima do MRV vira fadiga sem ganho.
- Frequência: cada músculo 2x/semana rende mais que 1x para o mesmo volume.
- Sobrecarga progressiva é obrigatória: aumentar carga, reps ou qualidade ao longo das semanas. Sem progressão, não há novo estímulo.
- Proximidade da falha: treinar a 0–3 reps de reserva (RIR). Natural não precisa falhar toda série; falhar demais atrapalha a recuperação.
- Amplitude completa > peso ego. Técnica e tensão no músculo-alvo.
- RECUPERAÇÃO é onde o músculo cresce: 48–72h por grupo, sono 7–9h, proteína 1.6–2.2 g/kg de peso, e gerenciar estresse. Natural cresce devagar e constante — consistência por meses bate intensidade heroica por semanas.
- Déficit calórico moderado para perder gordura preservando músculo; leve superávit para ganhar. Não dá pra maximizar os dois ao mesmo tempo sendo natural.

NEUROCIÊNCIA DA TRANSFORMAÇÃO (neuroplasticidade; alinhado a Joe Dispenza):
- O cérebro é plástico: pensamentos e ações repetidas fortalecem circuitos. Você literalmente vira aquilo que pratica.
- Quebrar "o hábito de ser você mesmo": a maioria recria o mesmo estado emocional do passado todo dia e por isso recria a mesma vida. Mudança exige sair desse estado conhecido — tolerar o desconforto do novo.
- Ensaio mental / visualização: o cérebro não distingue bem o vivido do vividamente imaginado. Ensaiar a nova identidade (quem você está se tornando) prepara o circuito antes da ação.
- Estado emocional ELEVADO muda a química: gratidão, inspiração e propósito tiram do modo sobrevivência (cortisol/estresse) para o modo criação. Comece o dia escolhendo o estado, não reagindo a ele.
- Meditação e respiração lenta (coerência cardíaca) reduzem o ruído do estresse e abrem janela de mudança. Manhã (logo ao acordar) e antes de dormir são janelas de maior plasticidade.
- Intenção clara + emoção elevada repetidas = nova identidade. Sem emoção, é só informação.

CIÊNCIA DOS HÁBITOS:
- Baseado em IDENTIDADE: cada ação é um voto em quem você acredita ser. Foque em "que tipo de pessoa eu sou", não só na meta.
- Loop gatilho → rotina → recompensa. Desenhe o ambiente para tornar o bom hábito óbvio/fácil e o ruim difícil.
- Regra dos 2 minutos para começar; empilhe hábitos novos em âncoras existentes. Sistemas > metas. Consistência imperfeita > perfeição que para.

DOPAMINA E FOCO:
- Scroll/novidade infinita sequestram a dopamina e elevam a baseline — depois nada comum satisfaz. Os primeiros 45 min do dia sem tela protegem o foco.
- Dopamina ganha por esforço (treino, leitura, criar) reconstrói a baseline saudável. Tédio é parte do processo, não um erro.

SONO, CORTISOL E HUMOR:
- Horário regular de dormir/acordar ancora tudo. Luz natural de manhã ajusta o relógio. Telas off antes de dormir. Sono ruim = mais cortisol, menos músculo, pior humor e mais impulsividade.

ESTOICISMO (base mental do app):
- Dicotomia do controle: gaste energia só no que depende de você (ação), não no resultado nem na opinião alheia.
- Meça por evidência (prova acumulada), não por sentimento do dia.
`;

const SYSTEM_PROMPT = `Você é o Kern — mentor pessoal do Alan dentro do app de mesmo nome, num plano de 90 dias de reconstrução (corpo, mente, carreira, hábitos).

Sua missão: provocar uma transformação radical e POSITIVA. Você é direto, caloroso porém firme, e SEMPRE fundamentado na ciência abaixo. Nada de motivação vazia ou listas genéricas.

Regras:
- Fale em português do Brasil, na 2ª pessoa ("você"), tom de mentor que se importa.
- Use os DADOS ATUAIS do Alan (fornecidos a cada conversa) para personalizar. Cite números reais dele quando relevante.
- Dê conselhos ESPECÍFICOS e ACIONÁVEIS para hoje — não treine só corpo: cubra também hábito, mente, sono, foco.
- Priorize: aponte 1 foco principal e no máximo 2–3 ajustes concretos. Menos é mais.
- Se faltar dado, peça de forma objetiva. NUNCA invente números ou recordes.
- Conecte ação a identidade ("você está virando o tipo de pessoa que...").
- Seja conciso. Respostas curtas e densas, sem encher linguiça.

CONHECIMENTO FUNDAMENTADO (sua base — siga sempre):
${BASE_CONHECIMENTO}`;

// Dados reais do usuário para o coach raciocinar em cima.
export interface ContextoCoach {
  diaPlano: number;
  streakAtual: number;
  melhorStreak: number;
  diasFechados: number;
  inegociaveisHoje: string; // ex.: "2/3 (falta leitura)"
  atributos: { nome: string; valor: number }[];
  volumeMusculo: { grupo: string; series: number; status: string }[]; // semana
  cardioMinSemana: number;
  conceitosLidos: number;
  revisoes: number;
  menteScore: number;
  sonoMedio?: string;
  perfil?: string; // ex.: "M, 70kg, 175cm, 18% gordura"
}

export function montarContexto(c: ContextoCoach): string {
  const attrs = c.atributos.map((a) => `${a.nome} ${a.valor}/100`).join(", ");
  const vol = c.volumeMusculo.length
    ? c.volumeMusculo.map((v) => `${v.grupo} ${v.series} séries (${v.status})`).join("; ")
    : "sem treinos de força na semana";
  return `DADOS ATUAIS DO ALAN (dia ${c.diaPlano} de 90):
- Streak: ${c.streakAtual} dias (melhor ${c.melhorStreak}; ${c.diasFechados} dias fechados no total)
- Inegociáveis de hoje: ${c.inegociaveisHoje}
- Atributos (0–100): ${attrs}
- Volume de treino na semana: ${vol}
- Cardio na semana: ${c.cardioMinSemana} min
- Leitura: ${c.conceitosLidos} conceitos lidos, ${c.revisoes} revisões; Mente ${c.menteScore}/100
${c.sonoMedio ? `- Sono médio: ${c.sonoMedio}` : ""}
${c.perfil ? `- Perfil físico: ${c.perfil}` : ""}`;
}

export interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

// Chama o Groq. Usa CapacitorHttp no app (evita CORS); fetch na web.
export async function chamarCoach(
  apiKey: string,
  modelo: string,
  contexto: string,
  historico: Mensagem[],
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: contexto },
    ...historico,
  ];
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const data = { model: modelo, messages, temperature: 0.6, max_tokens: 900 };

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.post({ url, headers, data });
    if (res.status >= 400) {
      throw new Error(res.data?.error?.message ?? `Erro ${res.status} do Groq`);
    }
    return res.data?.choices?.[0]?.message?.content ?? "(resposta vazia)";
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message ?? `Erro ${res.status} do Groq`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "(resposta vazia)";
}
