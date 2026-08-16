// Recorte de progressão: o que aconteceu numa janela de tempo e como ela se
// compara com a janela anterior.
//
// O coach só via fotografia — volume da semana, recordes de todos os tempos.
// Faltava a derivada: quantas sessões, quanto peso, quantos recordes NOVOS, e
// se isso está subindo ou caindo. É a diferença entre "você treinou 14 séries
// de peito" e "você treinou menos que na semana passada e não bateu nenhum
// recorde há três semanas".

import type { Treino } from "./db";
import { obterMusculosAlvo } from "./musculacao";

export interface RecordeBatido {
  exercicio: string;
  peso: number;
  reps: number;
  anterior: number; // melhor carga antes desta janela
  data: string; // "DD/MM"
}

export interface Recorte {
  dias: number;
  sessoes: number;
  seriesEfetivas: number;
  /** Peso total movido (kg): soma de carga × repetições. Bruto, mas comparável. */
  tonelagem: number;
  recordes: RecordeBatido[];
  /** Diferença para a janela imediatamente anterior, do mesmo tamanho. */
  vsAnterior: {
    sessoes: number;
    tonelagem: number;
    seriesEfetivas: number;
  };
}

/** Aquecimento não conta como volume nem como carga movida. */
const efetivas = <T extends { tipo?: string }>(sets: T[]) => sets.filter((s) => s.tipo !== "warmup");

function agregar(treinos: Treino[]) {
  let seriesEfetivas = 0;
  let tonelagem = 0;
  for (const t of treinos) {
    for (const ex of t.exercicios) {
      for (const s of efetivas(ex.sets)) {
        seriesEfetivas++;
        tonelagem += s.peso * s.reps;
      }
    }
  }
  return { sessoes: treinos.length, seriesEfetivas, tonelagem: Math.round(tonelagem) };
}

/**
 * Recordes batidos DENTRO da janela — não os de todos os tempos.
 *
 * Um recorde só conta se supera a melhor carga registrada ANTES da janela. Sem
 * essa comparação, todo primeiro registro de um exercício viraria "recorde" e o
 * número perderia sentido.
 */
function recordesNaJanela(anteriores: Treino[], janela: Treino[]): RecordeBatido[] {
  const melhorAntes = new Map<string, number>();
  for (const t of anteriores) {
    for (const ex of t.exercicios) {
      for (const s of ex.sets) {
        if (s.peso > (melhorAntes.get(ex.nome) ?? 0)) melhorAntes.set(ex.nome, s.peso);
      }
    }
  }

  const batidos = new Map<string, RecordeBatido>();
  for (const t of [...janela].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const data = new Date(t.inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    for (const ex of t.exercicios) {
      const referencia = melhorAntes.get(ex.nome);
      // Exercício estreando na janela não gera recorde: não há o que superar.
      if (referencia === undefined) continue;
      for (const s of ex.sets) {
        if (s.peso > referencia && s.peso > (batidos.get(ex.nome)?.peso ?? 0)) {
          batidos.set(ex.nome, {
            exercicio: ex.nome,
            peso: s.peso,
            reps: s.reps,
            anterior: referencia,
            data,
          });
        }
      }
    }
  }
  return [...batidos.values()].sort((a, b) => b.peso - a.peso);
}

export function calcularRecorte(treinos: Treino[], dias: number, agora = Date.now()): Recorte {
  const inicioJanela = agora - dias * 86_400_000;
  const inicioAnterior = agora - 2 * dias * 86_400_000;

  const ts = (t: Treino) => new Date(t.inicio).getTime();
  const janela = treinos.filter((t) => ts(t) >= inicioJanela);
  const anterior = treinos.filter((t) => ts(t) >= inicioAnterior && ts(t) < inicioJanela);
  const antesDaJanela = treinos.filter((t) => ts(t) < inicioJanela);

  const a = agregar(janela);
  const b = agregar(anterior);

  return {
    dias,
    ...a,
    recordes: recordesNaJanela(antesDaJanela, janela),
    vsAnterior: {
      sessoes: a.sessoes - b.sessoes,
      tonelagem: a.tonelagem - b.tonelagem,
      seriesEfetivas: a.seriesEfetivas - b.seriesEfetivas,
    },
  };
}

/** Há quantos dias não sai um recorde? Sinal direto de estagnação de carga. */
export function diasSemRecorde(treinos: Treino[], agora = Date.now()): number | null {
  const ordenados = [...treinos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const melhor = new Map<string, number>();
  let ultimoPR: number | null = null;

  for (const t of ordenados) {
    for (const ex of t.exercicios) {
      for (const s of ex.sets) {
        const referencia = melhor.get(ex.nome);
        if (referencia !== undefined && s.peso > referencia) {
          ultimoPR = new Date(t.inicio).getTime();
        }
        if (s.peso > (referencia ?? 0)) melhor.set(ex.nome, s.peso);
      }
    }
  }

  if (ultimoPR === null) return null;
  return Math.floor((agora - ultimoPR) / 86_400_000);
}

/** Grupos musculares que não recebem série há mais de `limite` dias. */
export function gruposAbandonados(
  treinos: Treino[],
  limite = 10,
  agora = Date.now(),
): { grupo: string; dias: number }[] {
  const ultimo = new Map<string, number>();
  for (const t of treinos) {
    const quando = new Date(t.inicio).getTime();
    for (const ex of t.exercicios) {
      if (efetivas(ex.sets).length === 0) continue;
      for (const alvo of obterMusculosAlvo(ex.nome)) {
        // Só conta como treinado o que foi alvo principal — aparecer de
        // sinergista não sustenta um grupo.
        if (alvo.fator < 1) continue;
        if (quando > (ultimo.get(alvo.grupo) ?? 0)) ultimo.set(alvo.grupo, quando);
      }
    }
  }

  return [...ultimo.entries()]
    .map(([grupo, quando]) => ({ grupo, dias: Math.floor((agora - quando) / 86_400_000) }))
    .filter((g) => g.dias > limite)
    .sort((a, b) => b.dias - a.dias);
}

/** Texto pronto para o contexto do coach. */
export function descreverRecorte(r: Recorte): string {
  const sinal = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const linhas = [
    `últimos ${r.dias} dias: ${r.sessoes} sessões (${sinal(r.vsAnterior.sessoes)} vs período anterior), ` +
      `${r.seriesEfetivas} séries efetivas (${sinal(r.vsAnterior.seriesEfetivas)}), ` +
      `${r.tonelagem.toLocaleString("pt-BR")} kg movidos (${sinal(r.vsAnterior.tonelagem)})`,
  ];
  if (r.recordes.length > 0) {
    const lista = r.recordes
      .slice(0, 6)
      .map((p) => `${p.exercicio} ${p.peso}kg×${p.reps} (era ${p.anterior}kg, em ${p.data})`)
      .join("; ");
    linhas.push(`recordes batidos no período: ${r.recordes.length} — ${lista}`);
  } else {
    linhas.push("nenhum recorde novo no período");
  }
  return linhas.join("\n  ");
}
