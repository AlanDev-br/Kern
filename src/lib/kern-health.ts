"use client";

// Camada tipada sobre o KernHealthPlugin — a ponte nativa com o Health Connect.
//
// Fonte de dados: Xiaomi Mi Band 10, publicando pelo Mi Fitness. A Huawei Band saiu
// de operação nesta fase; com uma pulseira só, some o risco de duas fontes contarem
// o mesmo passo, sono ou treino duas vezes.
//
// PRINCÍPIO: aqui só se lê e se guarda o bruto. Média, consolidação e cruzamento
// acontecem sobre o que está gravado, nunca no caminho da leitura. É a mesma escolha
// já feita na balança (guardar peso e impedância, derivar composição depois) e ela se
// paga quando uma fórmula melhora: o histórico inteiro é recalculado sem precisar
// pedir nada de volta ao aparelho.

import { Capacitor, registerPlugin } from "@capacitor/core";
import { db } from "./db";

/** Tipos do catálogo. Os nomes espelham o CATALOGO do KernHealth.kt. */
export const TIPOS_SAUDE = [
  "Steps",
  "StepsCadenceSeries",
  "Distance",
  "SpeedSeries",
  "PowerSeries",
  "CyclingPedalingCadenceSeries",
  "FloorsClimbed",
  "ElevationGained",
  "WheelchairPushes",
  "ActivitySession",
  "TotalCaloriesBurned",
  "ActiveCaloriesBurned",
  "BasalMetabolicRate",
  "HeartRateSeries",
  "RestingHeartRate",
  "HeartRateVariabilityRmssd",
  "OxygenSaturation",
  "RespiratoryRate",
  "Vo2Max",
  "BloodPressure",
  "SleepSession",
  "Weight",
  "Height",
  "BodyFat",
  "BodyWaterMass",
  "BoneMass",
  "LeanBodyMass",
  "SkinTemperature",
  "BodyTemperature",
  "BasalBodyTemperature",
  "Hydration",
  "Nutrition",
  "BloodGlucose",
] as const;

export type TipoSaude = (typeof TIPOS_SAUDE)[number];

/** Rótulo em português e o grupo em que o tipo aparece na tela. */
export const ROTULO_TIPO: Record<TipoSaude, { nome: string; grupo: GrupoSaude }> = {
  Steps: { nome: "Passos", grupo: "movimento" },
  StepsCadenceSeries: { nome: "Cadência de passo", grupo: "movimento" },
  Distance: { nome: "Distância", grupo: "movimento" },
  SpeedSeries: { nome: "Velocidade", grupo: "movimento" },
  PowerSeries: { nome: "Potência", grupo: "movimento" },
  CyclingPedalingCadenceSeries: { nome: "Cadência de pedal", grupo: "movimento" },
  FloorsClimbed: { nome: "Andares subidos", grupo: "movimento" },
  ElevationGained: { nome: "Elevação", grupo: "movimento" },
  WheelchairPushes: { nome: "Impulsos", grupo: "movimento" },
  ActivitySession: { nome: "Sessões de exercício", grupo: "movimento" },
  TotalCaloriesBurned: { nome: "Calorias totais", grupo: "energia" },
  ActiveCaloriesBurned: { nome: "Calorias ativas", grupo: "energia" },
  BasalMetabolicRate: { nome: "Metabolismo basal", grupo: "energia" },
  HeartRateSeries: { nome: "FC contínua", grupo: "coracao" },
  RestingHeartRate: { nome: "FC de repouso", grupo: "coracao" },
  HeartRateVariabilityRmssd: { nome: "Variabilidade (RMSSD)", grupo: "coracao" },
  OxygenSaturation: { nome: "Saturação de oxigênio", grupo: "coracao" },
  RespiratoryRate: { nome: "Frequência respiratória", grupo: "coracao" },
  Vo2Max: { nome: "VO₂ máx", grupo: "coracao" },
  BloodPressure: { nome: "Pressão arterial", grupo: "coracao" },
  SleepSession: { nome: "Sono", grupo: "sono" },
  Weight: { nome: "Peso", grupo: "corpo" },
  Height: { nome: "Altura", grupo: "corpo" },
  BodyFat: { nome: "Gordura corporal", grupo: "corpo" },
  BodyWaterMass: { nome: "Água corporal", grupo: "corpo" },
  BoneMass: { nome: "Massa óssea", grupo: "corpo" },
  LeanBodyMass: { nome: "Massa magra", grupo: "corpo" },
  SkinTemperature: { nome: "Temperatura da pele", grupo: "corpo" },
  BodyTemperature: { nome: "Temperatura corporal", grupo: "corpo" },
  BasalBodyTemperature: { nome: "Temperatura basal", grupo: "corpo" },
  Hydration: { nome: "Hidratação", grupo: "ingestao" },
  Nutrition: { nome: "Nutrição", grupo: "ingestao" },
  BloodGlucose: { nome: "Glicemia", grupo: "ingestao" },
};

export type GrupoSaude = "movimento" | "energia" | "coracao" | "sono" | "corpo" | "ingestao";

export const ROTULO_GRUPO: Record<GrupoSaude, string> = {
  movimento: "Movimento",
  energia: "Energia",
  coracao: "Coração e respiração",
  sono: "Sono",
  corpo: "Corpo",
  ingestao: "Ingestão",
};

// ── Contrato do plugin nativo ────────────────────────────────────────────────

export interface DispositivoSaude {
  fabricante?: string;
  modelo?: string;
  tipo?: string;
}

export interface MetaSaude {
  id: string;
  origem: string; // pacote que escreveu (ex.: com.mi.health)
  modificadoEm: string;
  idCliente?: string | null;
  metodo: string;
  dispositivo?: DispositivoSaude;
}

/** Envelope uniforme devolvido pelo plugin, igual para todo tipo. */
export interface RegistroSaude {
  tipo: TipoSaude;
  meta: MetaSaude;
  inicio: string;
  fim: string;
  fusoInicio?: string | null;
  duracaoMin?: number;
  valor?: number;
  unidade?: string;
  extra: Record<string, unknown>;
}

export interface SituacaoPermissoes {
  porTipo: Record<string, boolean>;
  faltando: string[];
  concedidos: number;
  total: number;
  historico: boolean;
  segundoPlano: boolean;
}

export interface RespostaLeitura {
  tipo: TipoSaude;
  permitido: boolean;
  registros: RegistroSaude[];
  quantidade?: number;
  truncado?: boolean;
  erro?: string;
}

interface KernHealthPlugin {
  disponibilidade(): Promise<{ status: "ok" | "sem-app" | "precisa-atualizar"; sdkStatus: number }>;
  catalogo(): Promise<{ tipos: { tipo: string; permissao: string; conhecido: boolean }[] }>;
  permissoes(): Promise<SituacaoPermissoes>;
  pedirPermissoes(): Promise<SituacaoPermissoes>;
  ler(op: { tipo: string; inicio: string; fim: string; limite?: number }): Promise<RespostaLeitura>;
}

const KernHealth = registerPlugin<KernHealthPlugin>("KernHealth");

export function nativo(): boolean {
  return Capacitor.isNativePlatform();
}

const SEM_PERMISSAO: SituacaoPermissoes = {
  porTipo: {},
  faltando: [...TIPOS_SAUDE],
  concedidos: 0,
  total: TIPOS_SAUDE.length,
  historico: false,
  segundoPlano: false,
};

export async function disponibilidade(): Promise<"ok" | "sem-app" | "precisa-atualizar" | "web"> {
  if (!nativo()) return "web";
  try {
    return (await KernHealth.disponibilidade()).status;
  } catch {
    return "sem-app";
  }
}

export async function permissoes(): Promise<SituacaoPermissoes> {
  if (!nativo()) return SEM_PERMISSAO;
  try {
    return await KernHealth.permissoes();
  } catch {
    return SEM_PERMISSAO;
  }
}

export async function pedirPermissoes(): Promise<SituacaoPermissoes> {
  if (!nativo()) return SEM_PERMISSAO;
  try {
    return await KernHealth.pedirPermissoes();
  } catch {
    return SEM_PERMISSAO;
  }
}

export async function ler(
  tipo: TipoSaude,
  inicio: Date,
  fim: Date,
  limite?: number,
): Promise<RespostaLeitura> {
  if (!nativo()) return { tipo, permitido: false, registros: [] };
  return KernHealth.ler({
    tipo,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    limite,
  });
}

// ── Persistência ─────────────────────────────────────────────────────────────

/** Amostra como fica guardada. `extra` carrega o que não coube no escalar. */
export interface AmostraSaude {
  id: string; // `${tipo}|${meta.id}` — o id do Health Connect já é estável
  tipo: TipoSaude;
  data: string; // "YYYY-MM-DD" local do início — chave de junção com o resto do app
  inicio: string;
  fim: string;
  valor?: number;
  unidade?: string;
  duracaoMin?: number;
  origem: string;
  dispositivo?: string;
  metodo: string;
  extra: Record<string, unknown>;
  gravadoEm: string;
}

/** Estado do próprio pipeline. Sem isso, "não tem dado" e "não li" viram a mesma tela. */
export interface EstadoSincronia {
  tipo: TipoSaude;
  ultimaTentativa: string;
  permitido: boolean;
  quantidade: number;
  truncado?: boolean;
  erro?: string;
}

/**
 * Teto de amostras por leitura. A FC contínua devolve uma amostra por poucos
 * segundos: um mês inteiro passa fácil de cem mil pontos, e carregar isso de uma vez
 * trava a WebView antes de servir para alguma coisa.
 */
const LIMITE_POR_TIPO: Partial<Record<TipoSaude, number>> = {
  HeartRateSeries: 1500,
  SpeedSeries: 1500,
  PowerSeries: 1500,
  StepsCadenceSeries: 1500,
  CyclingPedalingCadenceSeries: 1500,
  Steps: 4000,
};

function chaveLocal(iso: string): string {
  const d = new Date(iso);
  // Data local, não UTC: um treino das 22h vira o dia seguinte se usarmos ISO puro.
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function paraAmostra(r: RegistroSaude): AmostraSaude {
  const disp = r.meta.dispositivo;
  return {
    id: `${r.tipo}|${r.meta.id}`,
    tipo: r.tipo,
    data: chaveLocal(r.inicio),
    inicio: r.inicio,
    fim: r.fim,
    valor: r.valor,
    unidade: r.unidade,
    duracaoMin: r.duracaoMin,
    origem: r.meta.origem,
    dispositivo: disp
      ? [disp.fabricante, disp.modelo, disp.tipo].filter(Boolean).join(" ")
      : undefined,
    metodo: r.meta.metodo,
    extra: r.extra ?? {},
    gravadoEm: new Date().toISOString(),
  };
}

export interface ResultadoSincronia {
  dias: number;
  tiposComDado: number;
  amostras: number;
  estados: EstadoSincronia[];
}

/**
 * Lê a janela inteira, tipo a tipo, e grava.
 *
 * Um tipo negado ou com erro não interrompe os outros: o estado de cada um é
 * registrado em `saudeSync`. Um sync que aborta no primeiro tipo negado não
 * diagnostica nada — e o valor desta tela é justamente saber, tipo a tipo, o que a
 * Xiaomi publica e o que ela guarda para si.
 */
export async function sincronizar(dias = 35): Promise<ResultadoSincronia> {
  const fim = new Date();
  const inicio = new Date(fim.getTime() - dias * 86_400_000);

  const estados: EstadoSincronia[] = [];
  let amostras = 0;
  let tiposComDado = 0;

  for (const tipo of TIPOS_SAUDE) {
    const agora = new Date().toISOString();
    try {
      const r = await ler(tipo, inicio, fim, LIMITE_POR_TIPO[tipo] ?? 5000);
      const linhas = (r.registros ?? []).map(paraAmostra);
      if (linhas.length > 0) {
        await db.saudeAmostras.bulkPut(linhas);
        amostras += linhas.length;
        tiposComDado++;
      }
      estados.push({
        tipo,
        ultimaTentativa: agora,
        permitido: r.permitido,
        quantidade: linhas.length,
        truncado: r.truncado,
        erro: r.erro,
      });
    } catch (e) {
      estados.push({
        tipo,
        ultimaTentativa: agora,
        permitido: false,
        quantidade: 0,
        erro: (e as Error)?.message ?? String(e),
      });
    }
  }

  await db.saudeSync.bulkPut(estados);
  return { dias, tiposComDado, amostras, estados };
}

export async function estadosSincronia(): Promise<EstadoSincronia[]> {
  return db.saudeSync.toArray();
}

export async function amostrasDoTipo(tipo: TipoSaude, limite = 50): Promise<AmostraSaude[]> {
  const linhas = await db.saudeAmostras.where("tipo").equals(tipo).toArray();
  return linhas.sort((a, b) => b.inicio.localeCompare(a.inicio)).slice(0, limite);
}

/**
 * Amostras de uma janela de dias, opcionalmente restritas a alguns tipos.
 *
 * Restringir importa: a série contínua de FC carrega centenas de amostras por
 * registro, e um painel que só precisa de calorias não tem por que arrastar isso
 * para a memória. Com tipos, usa o índice composto [tipo+data]; sem tipos, o índice
 * de data.
 */
export async function amostrasNoPeriodo(
  inicio: string,
  fim: string,
  tipos?: TipoSaude[],
): Promise<AmostraSaude[]> {
  if (!tipos || tipos.length === 0) {
    return db.saudeAmostras.where("data").between(inicio, fim, true, true).toArray();
  }
  const partes = await Promise.all(
    tipos.map((t) =>
      db.saudeAmostras
        .where("[tipo+data]")
        .between([t, inicio], [t, fim], true, true)
        .toArray(),
    ),
  );
  return partes.flat();
}

/** Quantas amostras existem por tipo. Contagem por índice, sem carregar linha. */
export async function contagemPorTipo(): Promise<Record<string, number>> {
  const pares = await Promise.all(
    TIPOS_SAUDE.map(async (t) => [t, await db.saudeAmostras.where("tipo").equals(t).count()] as const),
  );
  return Object.fromEntries(pares);
}

/** Quem escreveu o quê. É o que denuncia dupla contagem antes de virar número errado. */
export async function origensPorTipo(): Promise<Record<string, Record<string, number>>> {
  const mapa: Record<string, Record<string, number>> = {};
  await db.saudeAmostras.each((a) => {
    const porOrigem = (mapa[a.tipo] ??= {});
    porOrigem[a.origem] = (porOrigem[a.origem] ?? 0) + 1;
  });
  return mapa;
}
