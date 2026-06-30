import type { Treino } from "./db";
import { volumeSemanal, avaliarVolume } from "./musculacao";
import { blocoAtivo, liftCanonico, estimar1RM, ROTULO_LIFT, type LiftId } from "./forca";

// ─────────────────────────────────────────────────────────────
// Periodização adaptativa para natural. Lê o histórico real e aponta a fase do
// mesociclo + correções baseadas nos SEUS erros: frequência baixa, volume fora
// da faixa, estagnação de carga e deload atrasado. É um coach que reage ao que
// você de fato fez, não um plano fixo.
// ─────────────────────────────────────────────────────────────

export interface RecomendacaoPeriod {
  tipo: "erro" | "alerta" | "ok";
  titulo: string;
  detalhe: string;
}

export interface DiagnosticoPeriod {
  temDados: boolean;
  destreinado: boolean;
  semanasNoBloco: number;
  sessoesUltimaSemana: number;
  fase: string;
  recomendacoes: RecomendacaoPeriod[];
}

const ACUMULO_SEMANAS = 4; // após isso, deload
const SESSOES_ALVO = 3; // por semana

function diasEntre(aIso: string, bIso: string): number {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 86400000;
}

// Quantas sessões-do-lift atrás foi o último recorde de 1RM estimado (no bloco).
// >= 3 sem novo recorde = estagnado.
function sessoesDesdeUltimoPR(bloco: Treino[], lift: LiftId): number | null {
  const tops: number[] = [];
  for (const t of bloco) {
    let topo = 0;
    for (const ex of t.exercicios) {
      if (liftCanonico(ex.nome) !== lift) continue;
      for (const s of ex.sets) topo = Math.max(topo, estimar1RM(s.peso, s.reps));
    }
    if (topo > 0) tops.push(topo);
  }
  if (tops.length < 3) return null; // poucos dados para julgar
  let best = 0;
  let idxBest = 0;
  tops.forEach((v, i) => {
    if (v > best) {
      best = v;
      idxBest = i;
    }
  });
  return tops.length - 1 - idxBest; // sessões após o melhor
}

export function diagnosticoPeriodizacao(treinos: Treino[]): DiagnosticoPeriod {
  const base: DiagnosticoPeriod = {
    temDados: treinos.length > 0,
    destreinado: false,
    semanasNoBloco: 0,
    sessoesUltimaSemana: 0,
    fase: "Sem dados",
    recomendacoes: [],
  };
  if (treinos.length === 0) return base;

  const bloco = blocoAtivo(treinos);
  const agora = Date.now();
  base.sessoesUltimaSemana = treinos.filter(
    (t) => (agora - new Date(t.inicio).getTime()) / 86400000 <= 7,
  ).length;

  const rec: RecomendacaoPeriod[] = [];

  // Destreinado → recomeço
  if (bloco.length === 0) {
    base.destreinado = true;
    base.fase = "Recomeço";
    rec.push({
      tipo: "erro",
      titulo: "Você destreinou",
      detalhe:
        "Mais de uma semana parado. Recomece leve (RIR 3–4, ~60% do volume habitual) e suba ao longo de 2–3 semanas — não tente voltar onde parou de uma vez.",
    });
    base.recomendacoes = rec;
    return base;
  }

  // Semanas dentro do bloco ativo
  const spanDias = diasEntre(bloco[0].inicio, bloco[bloco.length - 1].inicio);
  const semanas = Math.floor(spanDias / 7) + 1;
  base.semanasNoBloco = semanas;

  // Fase + deload
  if (semanas > ACUMULO_SEMANAS) {
    base.fase = "Deload recomendado";
    rec.push({
      tipo: "erro",
      titulo: `Deload atrasado (${semanas} semanas acumulando)`,
      detalhe:
        "Faça uma semana de deload: ~50% das séries, RIR 4–5. É o que permite o próximo ciclo render — pular acumula fadiga e estagna.",
    });
  } else {
    base.fase = `Acúmulo — semana ${semanas}`;
  }

  // Frequência / consistência
  if (base.sessoesUltimaSemana < SESSOES_ALVO) {
    rec.push({
      tipo: "alerta",
      titulo: `Frequência baixa (${base.sessoesUltimaSemana}/semana)`,
      detalhe: `Mire ${SESSOES_ALVO}+ sessões por semana e cada grupo 2×. Consistência rende mais que qualquer esquema.`,
    });
  }

  // Volume por grupo vs faixa de hipertrofia
  const avs = avaliarVolume(volumeSemanal(treinos));
  const baixos = avs.filter((a) => a.status === "baixo");
  const excessos = avs.filter((a) => a.status === "excesso");
  for (const a of excessos.slice(0, 2)) {
    rec.push({
      tipo: "erro",
      titulo: `${a.grupo}: volume em excesso (${a.series} séries)`,
      detalhe: "Acima do teto recuperável — vira junk volume. Corte 2–4 séries nesse grupo.",
    });
  }
  for (const a of baixos.slice(0, 2)) {
    rec.push({
      tipo: "alerta",
      titulo: `${a.grupo}: abaixo do mínimo (${a.series} séries)`,
      detalhe: "Adicione 2–3 séries semanais para entrar na faixa que faz crescer.",
    });
  }

  // Estagnação por levantamento principal
  const lifts: LiftId[] = ["supino", "desenvolvimento", "agachamento", "terra", "remada"];
  for (const lift of lifts) {
    const atras = sessoesDesdeUltimoPR(bloco, lift);
    if (atras == null) continue;
    if (atras >= 3) {
      rec.push({
        tipo: "alerta",
        titulo: `${ROTULO_LIFT[lift]} estagnado (${atras} treinos sem recorde)`,
        detalhe:
          "Troque a variável: suba reps no mesmo peso, melhore a execução, ou dê um mini-deload nesse exercício e ataque de novo.",
      });
    }
  }

  // Se nada deu errado, reforça o acerto
  if (rec.length === 0 || (rec.length === 1 && rec[0].tipo !== "erro")) {
    rec.unshift({
      tipo: "ok",
      titulo: "No caminho certo",
      detalhe: "Frequência, volume e progressão saudáveis. Mantenha e siga progredindo carga/reps.",
    });
  }

  base.recomendacoes = rec;
  return base;
}
