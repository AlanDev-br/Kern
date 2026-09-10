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
  { id: "openai/gpt-oss-120b", nome: "GPT-OSS 120B (recomendado)" },
  { id: "openai/gpt-oss-20b", nome: "GPT-OSS 20B (mais rápido)" },
];

// A Groq desligou a família Llama 3.x em 16/08/2026. Quem já usou o coach tem o
// id morto gravado na config, e continuaria levando erro da API a cada mensagem —
// por isso a troca acontece também na leitura, não só na lista acima. O destino de
// cada um é o substituto que a própria Groq indicou no aviso de descontinuação.
const MODELOS_APOSENTADOS: Record<string, string> = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama3-70b-8192": "openai/gpt-oss-120b",
  "llama3-8b-8192": "openai/gpt-oss-20b",
  "mixtral-8x7b-32768": "openai/gpt-oss-120b",
  "gemma2-9b-it": "openai/gpt-oss-20b",
};

/** Devolve sempre um modelo vivo: traduz o aposentado, ou usa o padrão. */
export function modeloVigente(id: string | undefined | null): string {
  if (!id) return MODELOS_GROQ[0].id;
  return MODELOS_APOSENTADOS[id] ?? id;
}

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

COMPOSIÇÃO CORPORAL — COMO LER OS NÚMEROS:
- PESO DE UM DIA É RUÍDO. Água, sal, horário, intestino e carboidrato mexem 1–2 kg sem nenhuma mudança de gordura. Só a MÉDIA de 7 dias e a variação por semana significam algo. Nunca comente uma pesagem isolada como se fosse progresso ou fracasso.
- Perda saudável: 0,5–1% do peso corporal por semana. Mais rápido que isso, sendo natural, é massa magra indo junto.
- CIRCUNFERÊNCIA DA CINTURA prediz risco melhor que percentual de gordura, porque mede a gordura visceral e não depende de estimativa elétrica. Homens: 94 cm acende alerta, 102 cm é risco substancialmente aumentado. Razão cintura/altura acima de 0,5 já indica excesso central.
- BIOIMPEDÂNCIA É ESTIMATIVA, não medição. Varia com hidratação, temperatura e hora. Comparar a leitura de hoje com a de ontem não diz nada; comparar o mês com o anterior, medido sempre na mesma condição (manhã, jejum, descalço), diz.
- Gordura visceral: até 9 saudável, 10–14 atenção, 15+ alto.

"FALSO MAGRO" (pouco músculo com gordura alta para o volume corporal):
- O erro clássico é atacar como se fosse obesidade: cortar calorias e fazer cardio. Isso derrete a pouca massa magra que existe, o peso cai, a proporção de gordura FICA IGUAL ou piora, e a pessoa fica menor com o mesmo problema.
- O caminho é RECOMPOSIÇÃO: treino de força pesado e progressivo, proteína alta (1,6–2,2 g/kg), calorias próximas da manutenção ou em leve superávit. Quem tem pouco treino de força consegue ganhar músculo e perder gordura ao mesmo tempo — é a única situação em que isso funciona bem.
- Nesse cenário o PESO QUASE NÃO SE MOVE por semanas. Isso é sucesso, não estagnação. O que muda é cintura caindo, músculo subindo e percentual de gordura caindo. Se o peso está parado mas a cintura diminuiu, ELOGIE — a pessoa está exatamente no caminho.
- Nunca recomende déficit agressivo para quem tem massa muscular baixa.

PROGRESSÃO — O QUE OLHAR NO RECORTE:
- SOBRECARGA PROGRESSIVA é o motor. Sem carga, reps ou qualidade subindo ao longo das semanas, não há estímulo novo, e volume alto vira só fadiga.
- RECORDES NO PERÍODO valem mais que recordes de todos os tempos: mostram se ainda há progressão. 3 a 6 semanas sem nenhum recorde, treinando direito, indica estagnação — trate como sinal, não como preguiça.
- TONELAGEM (carga × reps somados) é bruta mas comparável entre semanas. Caindo com o mesmo número de sessões: fadiga, doença ou sono ruim. Subindo com sessões iguais: progressão real.
- Nº DE SESSÕES é o dado mais honesto de aderência. Duas semanas seguidas abaixo do normal é problema de rotina, não de programa — resolva a rotina antes de mexer no treino.
- MÚSCULO ABANDONADO: mais de 10 dias sem estímulo direto já começa a perder adaptação. Aponte pelo nome.

SONO E CARDIORRESPIRATÓRIO:
- Menos de 7h de média por várias noites derruba testosterona, recuperação e controle de apetite. É a primeira coisa a corrigir — antes de mexer em dieta ou volume, porque sabota as duas.
- FC de repouso subindo alguns batimentos em relação ao normal, junto de treino pesado, sugere recuperação incompleta ou infecção chegando. Mande aliviar.
- VO2 máx estimado (por FC de repouso) é indicador de aptidão cardiorrespiratória e preditor de longevidade. Serve para acompanhar DIREÇÃO ao longo de meses, nunca para cravar valor — é estimativa de gabinete, não teste de laboratório. Sobe com cardio de baixa intensidade e volume constante.
- Se sono ou FC vierem ausentes, DIGA que faltam e explique como obter (o aparelho precisa escrever no Health Connect). Nunca finja que tem o dado.

CRUZAMENTOS QUE VOCÊ DEVE FAZER (não olhe métrica isolada):
- Sem recordes há semanas + sono abaixo de 7h = recuperação, não programa. Corrija o sono antes de trocar o treino.
- Sem recordes + volume dentro da faixa + sono bom = hora de mudar o estímulo (exercício, faixa de reps, técnica de intensidade).
- Tonelagem caindo + sessões mantidas + FC de repouso subindo = fadiga acumulada. Mande uma semana leve (deload).
- Sessões caindo + streak caindo = problema de rotina e ambiente, não de treino.
- Peso caindo rápido + volume de treino alto + sono curto = está perdendo músculo. Alerte.
- Peso estável + cintura caindo + carga subindo = recomposição funcionando. Confirme e mande manter.
- Volume acima do MRV + sono ruim + streak caindo = fadiga acumulada, não falta de disciplina. Mande reduzir volume antes de cobrar consistência.
- Gordura estimada caindo mas cintura igual = provavelmente ruído da bioimpedância, não progresso. Não comemore.

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
- Diga a incerteza quando ela existe: bioimpedância é estimativa. Não trate 27,6% como se fosse medida exata nem construa um plano inteiro em cima de uma casa decimal.
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
  composicao?: string; // leitura mais recente da balança
  tendenciaPeso?: string; // direção das últimas semanas, não o número do dia
  circunferencias?: string; // fita métrica: cintura é a que prediz risco
  recorte7?: string; // sessões, tonelagem e recordes da semana vs. anterior
  recorte30?: string; // o mesmo no mês — tendência de carga
  diasSemRecorde?: number | null;
  gruposAbandonados?: string; // músculos sem estímulo há tempo demais
  cardiorrespiratorio?: string; // sono, FC de repouso e VO2 máx estimado
  xpTotal: number;
  nivel: number;
  nivelNome: string;
  historicoTreinos?: string;
  recordesPessoais?: string;
}

export function montarContexto(c: ContextoCoach): string {
  const attrs = c.atributos.map((a) => `${a.nome} ${a.valor}/100`).join(", ");
  const vol = c.volumeMusculo.length
    ? c.volumeMusculo.map((v) => `${v.grupo} ${v.series} séries (${v.status})`).join("; ")
    : "sem treinos de força na semana";
  return `DADOS ATUAIS DO USUARIO (dia ${c.diaPlano} de 90):
- Nível de Desenvolvimento: Nível ${c.nivel} (${c.nivelNome}) com ${c.xpTotal} XP total
- Streak: ${c.streakAtual} dias (melhor ${c.melhorStreak}; ${c.diasFechados} dias fechados no total)
- Inegociáveis de hoje: ${c.inegociaveisHoje}
- Atributos (0–100): ${attrs}
- Volume de treino na semana: ${vol}
- Cardio na semana: ${c.cardioMinSemana} min
- Leitura: ${c.conceitosLidos} conceitos lidos, ${c.revisoes} revisões; Mente ${c.menteScore}/100
${c.sonoMedio ? `- Sono médio: ${c.sonoMedio}` : ""}
${c.perfil ? `- Perfil físico: ${c.perfil}` : ""}
${c.composicao ? `- Composição corporal (balança): ${c.composicao}` : ""}
${c.tendenciaPeso ? `- Tendência de peso: ${c.tendenciaPeso}` : ""}
${c.circunferencias ? `- Circunferências (fita): ${c.circunferencias}` : ""}
${c.recorte7 ? `- Semana:\n  ${c.recorte7}` : ""}
${c.recorte30 ? `- Mês:\n  ${c.recorte30}` : ""}
${c.diasSemRecorde != null ? `- Último recorde foi há ${c.diasSemRecorde} dias` : ""}
${c.gruposAbandonados ? `- Sem estímulo há tempo demais: ${c.gruposAbandonados}` : ""}
${c.cardiorrespiratorio ? `- Sono e cardiorrespiratório: ${c.cardiorrespiratorio}` : ""}
${c.historicoTreinos ? `- Histórico Recente de Treinos:\n${c.historicoTreinos}` : ""}
${c.recordesPessoais ? `- Recordes Pessoais (Cargas Máximas):\n${c.recordesPessoais}` : ""}`;
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
