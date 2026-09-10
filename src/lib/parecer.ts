"use client";

import { db, getConfig, type ParecerDiario } from "./db";
import { chaveDia, hojeChave } from "./dates";
import { calcularStreak } from "./gamification";
import { listarTarefas } from "./tarefas";
import {
  chamarCoach,
  modeloVigente,
  CHAVE_AMBIENTE,
  MODELO_AMBIENTE,
} from "./ia-coach";

// ─────────────────────────────────────────────────────────────
// Parecer do dia anterior
// ─────────────────────────────────────────────────────────────
// O coach só falava quando alguém abria o chat e digitava. Quem não perguntava
// nunca ouvia nada — e é justamente quem mais precisaria.
//
// Aqui a leitura acontece sozinha, uma vez por dia, na primeira abertura, e
// olha para ONTEM: o dia que já fechou é o único sobre o qual dá para dizer
// algo verdadeiro. Sobre hoje às 6h não há dado nenhum.
//
// Cada parecer custa uma chamada à Groq, então ele é gravado: reabrir o app
// cinco vezes no mesmo dia custa uma chamada, não cinco.

const SISTEMA_PARECER = `Você é o coach do Kern escrevendo a leitura do dia anterior.

REGRAS DE FORMA:
- No máximo 4 frases. Sem lista, sem título, sem markdown.
- Fale direto com a pessoa, em segunda pessoa, em português do Brasil.
- Nada de saudação ("Bom dia!") nem de fecho motivacional genérico.

REGRAS DE CONTEÚDO:
- Comece pelo fato mais relevante de ontem, não por um resumo de tudo.
- Um dado isolado não é tendência: peso de um dia, uma noite de sono ruim ou
  uma sessão perdida são ruído. Só chame de padrão o que aparece repetido.
- Se ontem foi um dia ruim, diga o que foi sem moralizar, e aponte UMA coisa
  concreta para hoje. Se foi bom, diga o que sustentou o resultado.
- Se não há dado suficiente sobre ontem, diga isso em uma frase e pare. Não
  invente leitura em cima de vazio.`;

/** Monta o recorte de ontem. Curto de propósito: o parecer é sobre um dia. */
async function contextoDeOntem(): Promise<string | null> {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const chaveOntem = chaveDia(ontem);

  const dia = await db.dias.get(chaveOntem);
  const tarefas = await listarTarefas();
  const inegociaveis = tarefas.filter((t) => t.category === "inegociavel");
  const concluidas = dia?.concluidas ?? [];

  const feitos = inegociaveis.filter((t) => concluidas.includes(t.id)).map((t) => t.titulo);
  const faltaram = inegociaveis.filter((t) => !concluidas.includes(t.id)).map((t) => t.titulo);

  const dias = await db.dias.toArray();
  const streak = calcularStreak(dias);

  const inicioOntem = new Date(ontem);
  inicioOntem.setHours(0, 0, 0, 0);
  const fimOntem = new Date(ontem);
  fimOntem.setHours(23, 59, 59, 999);

  const treinos = (await db.treinos.toArray()).filter((t) => {
    const d = new Date(t.inicio);
    return d >= inicioOntem && d <= fimOntem;
  });
  const cardios = (await db.cardios.toArray()).filter((c) => c.data === chaveOntem);

  // Sem nenhum sinal de ontem, não há o que ler — e gastar uma chamada para a
  // IA dizer "não tenho dados" é pior que não chamar.
  const houveSinal =
    concluidas.length > 0 || treinos.length > 0 || cardios.length > 0 || !!dia;
  if (!houveSinal) return null;

  const linhas = [
    `Ontem (${chaveOntem}):`,
    `- Inegociáveis cumpridos: ${feitos.length}/${inegociaveis.length}${feitos.length ? ` (${feitos.join("; ")})` : ""}`,
    faltaram.length ? `- Ficaram faltando: ${faltaram.join("; ")}` : null,
    `- Saldo de XP do dia: ${dia?.xp ?? 0}`,
    `- Streak atual: ${streak.atual} dias (melhor: ${streak.melhor})`,
    treinos.length
      ? `- Treino: ${treinos.length} sessão(ões), ${treinos.reduce((s, t) => s + t.exercicios.length, 0)} exercícios`
      : "- Treino: nenhuma sessão registrada",
    cardios.length
      ? `- Cardio: ${cardios.reduce((s, c) => s + c.minutos, 0)} min`
      : null,
  ].filter(Boolean);

  // Os últimos 7 dias entram só como pano de fundo, para separar dia ruim
  // isolado de padrão — que é a distinção que o prompt cobra.
  const ultimos7 = dias
    .filter((d) => d.data < chaveOntem)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 7);
  if (ultimos7.length) {
    const fechados = ultimos7.filter((d) => d.fechouInegociaveis).length;
    linhas.push(`- Pano de fundo: ${fechados} dos ${ultimos7.length} dias anteriores fechados.`);
  }

  return linhas.join("\n");
}

/**
 * Gera o parecer de hoje se ainda não existir. Devolve o parecer (novo ou já
 * gravado), ou null quando não há chave, não há dado de ontem, ou a chamada
 * falhou — o app tem de abrir normalmente nos três casos.
 */
export async function gerarParecerSeNecessario(): Promise<ParecerDiario | null> {
  const hoje = hojeChave();

  try {
    const existente = await db.pareceres.get(hoje);
    if (existente) return existente;

    const config = await getConfig();
    const chave = config.iaApiKey || CHAVE_AMBIENTE;
    if (!chave) return null; // coach não configurado: silêncio, não erro

    const contexto = await contextoDeOntem();
    if (!contexto) return null;

    const modelo = modeloVigente(config.iaModelo || MODELO_AMBIENTE);
    const texto = await chamarCoach(chave, modelo, contexto, [
      { role: "user", content: SISTEMA_PARECER },
    ]);

    const parecer: ParecerDiario = {
      data: hoje,
      texto: texto.trim(),
      modelo,
      criadoEm: new Date().toISOString(),
    };
    await db.pareceres.put(parecer);
    return parecer;
  } catch {
    // Rede fora, cota estourada, modelo recusado: o parecer é um extra, nunca
    // um bloqueio. Não grava nada, e a próxima abertura tenta de novo.
    return null;
  }
}

/** O parecer de hoje, sem gerar nada. Para a tela ler sem disparar chamada. */
export async function parecerDeHoje(): Promise<ParecerDiario | null> {
  try {
    return (await db.pareceres.get(hojeChave())) ?? null;
  } catch {
    return null;
  }
}
