// ─────────────────────────────────────────────────────────────
// Regras de fusão entre dois aparelhos
// ─────────────────────────────────────────────────────────────
// Etapa 2 de 3 da sincronia por rede local. Aqui não há rede nem banco: só
// funções puras que recebem duas listas e devolvem uma. É deliberado — é o que
// permite testar as regras direto no Node, com conflitos montados à mão, em vez
// de descobrir o erro no aparelho com dado real.
//
// O princípio que decide tudo: na dúvida, PRESERVAR. Um registro duplicado o
// usuário apaga; um registro perdido ele não recupera, e muitas vezes nem
// percebe que sumiu.

/** Como cada tabela se funde. */
export type Estrategia =
  /** União por chave. Para o que só cresce: treino, leitura, pesagem, medição. */
  | "uniao"
  /** União do conteúdo do dia. O checklist é o único caso: marcar uma tarefa no
   *  celular e outra no desktop no mesmo dia tem de SOMAR, não competir. */
  | "uniao-dia"
  /** O mais recente vence, e o registro é tratado como um bloco. Para
   *  preferência, não para histórico. */
  | "recente"
  /** Não atravessa. Fica em cada aparelho. */
  | "local";

export interface Regra {
  estrategia: Estrategia;
  /** Campo que identifica o registro entre aparelhos. */
  chave: string;
}

export const REGRAS: Record<string, Regra> = {
  // ── União: histórico, só cresce ──
  treinos: { estrategia: "uniao", chave: "id" },
  rotinas: { estrategia: "uniao", chave: "id" },
  leituras: { estrategia: "uniao", chave: "id" },
  cardios: { estrategia: "uniao", chave: "id" },
  medidasCorporais: { estrategia: "uniao", chave: "id" },
  saudeAmostras: { estrategia: "uniao", chave: "id" },
  dividas: { estrategia: "uniao", chave: "id" },
  conquistas: { estrategia: "uniao", chave: "id" },
  revisoes: { estrategia: "uniao", chave: "semana" },
  exercicioConfigs: { estrategia: "uniao", chave: "nome" },
  pareceres: { estrategia: "uniao", chave: "data" },

  // As quatro que ganharam uid na etapa 1. É por ele que casam, e não pelo
  // `id` local, que cada aparelho numera do seu jeito.
  avaliacoesMente: { estrategia: "uniao", chave: "uid" },
  testesCognitivos: { estrategia: "uniao", chave: "uid" },
  conversasCoach: { estrategia: "uniao", chave: "uid" },
  meditacoes: { estrategia: "uniao", chave: "uid" },

  // ── O caso especial ──
  dias: { estrategia: "uniao-dia", chave: "data" },

  // ── Bloco, mais recente vence ──
  // O checklist é pequeno, muda pouco, e fundir por registro produziria uma
  // lista Frankenstein: metade da ordem de um aparelho, metade do outro. Vale
  // mais tratar como um conjunto só.
  tarefas: { estrategia: "recente", chave: "id" },
  config: { estrategia: "recente", chave: "id" },

  // ── Não atravessa ──
  // Treino em andamento é do aparelho que está na academia. Sincronizar um
  // rascunho faria o desktop "continuar" uma série que ninguém está fazendo.
  rascunhoTreino: { estrategia: "local", chave: "id" },
  // Estado da leitura do Health Connect: só o celular tem pulseira.
  saudeSync: { estrategia: "local", chave: "tipo" },
  // O GLB do avatar é um blob pesado, e é o mesmo modelo dos dois lados.
  avatar: { estrategia: "local", chave: "id" },
  // Imagem de exercício importada do aparelho, idem.
  exImagens: { estrategia: "local", chave: "nome" },
};

type Registro = Record<string, unknown>;

/**
 * União por chave. Registro que existe só de um lado entra; existindo dos dois,
 * fica o que tem `atualizadoEm` mais recente, e na falta dele o local — porque
 * sem carimbo de tempo não há como saber qual é mais novo, e trocar o que já
 * está aqui por um palpite é a troca errada.
 */
export function fundirUniao(local: Registro[], remoto: Registro[], chave: string): Registro[] {
  const saida = new Map<string, Registro>();
  for (const r of local) {
    const k = r[chave];
    if (k === undefined || k === null) continue;
    saida.set(String(k), r);
  }
  for (const r of remoto) {
    const k = r[chave];
    if (k === undefined || k === null) continue;
    const id = String(k);
    const atual = saida.get(id);
    if (!atual) { saida.set(id, r); continue; }
    if (maisRecente(r) > maisRecente(atual)) saida.set(id, r);
  }
  return [...saida.values()];
}

/** Carimbo de tempo do registro, em milissegundos. 0 quando não há. */
function maisRecente(r: Registro): number {
  for (const campo of ["atualizadoEm", "criadoEm", "data", "inicio"]) {
    const v = r[campo];
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

export interface DiaFundivel {
  data: string;
  concluidas: string[];
  fechouInegociaveis: boolean;
  xp: number;
  acordarManual?: string;
  dormirManual?: string;
}

/**
 * Funde os dias. É a única tabela em que o conteúdo do registro se soma em vez
 * de um lado ganhar: marcar "treino" no celular e "leitura" no desktop no mesmo
 * dia tem de resultar nos dois marcados.
 *
 * O XP NÃO é somado nem escolhido — é recalculado a partir da união das
 * tarefas, por quem sabe a regra. Somar dois XP do mesmo dia contaria a mesma
 * tarefa duas vezes; escolher um dos dois ignoraria o que o outro fez.
 */
export function fundirDias(
  local: DiaFundivel[],
  remoto: DiaFundivel[],
  recalcular: (concluidas: string[]) => { xp: number; fechouInegociaveis: boolean },
): DiaFundivel[] {
  const porData = new Map<string, DiaFundivel>();
  for (const d of local) porData.set(d.data, { ...d });

  for (const d of remoto) {
    const atual = porData.get(d.data);
    if (!atual) { porData.set(d.data, { ...d }); continue; }

    const concluidas = [...new Set([...atual.concluidas, ...d.concluidas])];
    const { xp, fechouInegociaveis } = recalcular(concluidas);
    porData.set(d.data, {
      data: d.data,
      concluidas,
      xp,
      fechouInegociaveis,
      // Horário anotado à mão só existe de um lado; o que existir prevalece.
      acordarManual: atual.acordarManual ?? d.acordarManual,
      dormirManual: atual.dormirManual ?? d.dormirManual,
    });
  }

  return [...porData.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * O conjunto mais recente vence, inteiro. Para tabela tratada como bloco.
 * Empate mantém o local: quem está aqui não sai sem motivo.
 */
export function fundirRecente(
  local: Registro[],
  remoto: Registro[],
  carimboLocal: number,
  carimboRemoto: number,
): Registro[] {
  return carimboRemoto > carimboLocal ? remoto : local;
}

export interface ResumoFusao {
  tabela: string;
  estrategia: Estrategia;
  antes: number;
  depois: number;
  entraram: number;
}

/** Aplica a regra da tabela e descreve o que mudou, para a tela poder contar. */
export function fundirTabela(
  tabela: string,
  local: Registro[],
  remoto: Registro[],
  opcoes: {
    recalcularDia?: (c: string[]) => { xp: number; fechouInegociaveis: boolean };
    carimboLocal?: number;
    carimboRemoto?: number;
  } = {},
): { registros: Registro[]; resumo: ResumoFusao } {
  const regra = REGRAS[tabela];
  const base: ResumoFusao = {
    tabela,
    estrategia: regra?.estrategia ?? "local",
    antes: local.length,
    depois: local.length,
    entraram: 0,
  };

  // Tabela desconhecida não atravessa. Regra nova exige decisão explícita, e o
  // padrão seguro é não mexer.
  if (!regra || regra.estrategia === "local") return { registros: local, resumo: base };

  let registros: Registro[];
  if (regra.estrategia === "uniao") {
    registros = fundirUniao(local, remoto, regra.chave);
  } else if (regra.estrategia === "uniao-dia") {
    const rec = opcoes.recalcularDia ?? ((c: string[]) => ({ xp: 0, fechouInegociaveis: c.length > 0 }));
    registros = fundirDias(
      local as unknown as DiaFundivel[],
      remoto as unknown as DiaFundivel[],
      rec,
    ) as unknown as Registro[];
  } else {
    registros = fundirRecente(local, remoto, opcoes.carimboLocal ?? 0, opcoes.carimboRemoto ?? 0);
  }

  return {
    registros,
    resumo: { ...base, depois: registros.length, entraram: Math.max(0, registros.length - local.length) },
  };
}
