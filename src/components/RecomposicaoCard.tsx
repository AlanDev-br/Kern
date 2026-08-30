"use client";

import { TEXTO_VEREDITO, type Recomposicao } from "@/lib/recomposicao";

/**
 * O cruzamento balança × pulseira.
 *
 * A leitura principal é uma frase, não um número gigante: "o peso caiu 1,2 kg" não
 * informa nada sozinho, e a decisão que o Alan toma depende de *o que* caiu. O número
 * vem depois, na barra que divide a variação entre gordura e massa magra, porque essa
 * proporção é a informação — não o total.
 */

const CORES: Record<Recomposicao["veredito"], string> = {
  recomposicao: "text-accent",
  "gordura-limpa": "text-accent",
  "custo-magra": "text-amber-400",
  "ganho-limpo": "text-fg",
  "ganho-gordo": "text-amber-400",
  estavel: "text-fg",
  "sem-dados": "text-muted",
};

function sinal(v: number, casas = 1, unidade = "kg"): string {
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${Math.abs(v).toFixed(casas)} ${unidade}`;
}

function Linha({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted">{rotulo}</dt>
      <dd className="text-right">
        <span className="num text-sm font-semibold">{valor}</span>
        {nota && <span className="ml-2 text-xs text-muted">{nota}</span>}
      </dd>
    </div>
  );
}

/**
 * Barra divergente: a variação de gordura e a de massa magra na mesma régua, cada
 * uma para o seu lado do zero. É a forma mais curta de mostrar o caso que importa —
 * peso caindo com massa magra junto — sem exigir que se compare dois números.
 */
function BarraDivisao({ gordura, magra }: { gordura: number; magra: number }) {
  const escala = Math.max(Math.abs(gordura), Math.abs(magra), 0.5);
  const largura = (v: number) => `${(Math.abs(v) / escala) * 50}%`;

  // A cor diz se a direção é favorável, não qual série é. Gordura descendo e massa
  // magra subindo são as duas direções desejadas; pintar por série faria "gordura"
  // aparecer em verde no dia em que ela sobe, que é exatamente quando o gráfico
  // precisa incomodar.
  const cor = (v: number, bomQuandoNegativo: boolean) => {
    if (Math.abs(v) < 0.05) return "bg-muted/40";
    const favoravel = bomQuandoNegativo ? v < 0 : v > 0;
    return favoravel ? "bg-accent" : "bg-amber-400";
  };
  const corGordura = cor(gordura, true);
  const corMagra = cor(magra, false);

  const posicao = (v: number) =>
    v < 0 ? { right: "50%" as const } : { left: "50%" as const };

  return (
    <div className="mt-4">
      <div className="relative h-9 overflow-hidden rounded-lg bg-bg/60">
        <div
          className={`absolute top-1 h-3 rounded-sm transition-[width] duration-300 ${corGordura}`}
          style={{ width: largura(gordura), ...posicao(gordura) }}
        />
        <div
          className={`absolute bottom-1 h-3 rounded-sm transition-[width] duration-300 ${corMagra}`}
          style={{ width: largura(magra), ...posicao(magra) }}
        />
        {/* O eixo do zero vem por último: é a referência de leitura e precisa cruzar
            as barras, não sumir atrás da maior delas. */}
        <div className="absolute inset-y-0 left-1/2 z-10 w-px bg-fg/30" />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <span className={`h-2 w-2 rounded-sm ${corGordura}`} />
          gordura <span className="num text-fg">{sinal(gordura, 2)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className={`h-2 w-2 rounded-sm ${corMagra}`} />
          massa magra <span className="num text-fg">{sinal(magra, 2)}</span>
        </span>
      </div>
    </div>
  );
}

export function RecomposicaoCard({ r }: { r: Recomposicao }) {
  if (r.veredito === "sem-dados") {
    return (
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-bold">Recomposição</h2>
        <p className="mt-2 text-sm text-muted">
          Faltam pesagens para comparar duas janelas. Pese-se descalço na Scale 2 pela
          manhã por algumas semanas — é da diferença entre janelas que sai a resposta,
          nunca de uma pesagem isolada.
        </p>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-base font-bold">Recomposição</h2>
      <p className={`mt-1 text-lg font-semibold leading-snug ${CORES[r.veredito]}`}>
        {TEXTO_VEREDITO[r.veredito]}
      </p>
      <p className="mt-1 text-xs text-muted">
        {r.diasCobertos} dias entre as janelas · {r.inicio?.pesagens ?? 0} e{" "}
        {r.fim?.pesagens ?? 0} pesagens comparadas
      </p>

      {r.deltaGorduraKg !== undefined && r.deltaMagraKg !== undefined ? (
        <BarraDivisao gordura={r.deltaGorduraKg} magra={r.deltaMagraKg} />
      ) : null}

      <dl className="mt-4 divide-y divide-line/60 border-t border-line/60 pt-1">
        {r.deltaPesoKg !== undefined && (
          <Linha
            rotulo="Variação de peso"
            valor={sinal(r.deltaPesoKg, 2)}
            nota={
              r.fracaoGordura !== undefined
                ? `${Math.round(r.fracaoGordura * 100)}% disso foi gordura`
                : undefined
            }
          />
        )}
        {r.gastoMedioKcal !== undefined && (
          <Linha
            rotulo="Gasto médio da pulseira"
            valor={`${r.gastoMedioKcal} kcal/dia`}
            nota={`${r.diasComGasto} dias medidos`}
          />
        )}
        {r.balancoKcalDia !== undefined && (
          <Linha rotulo="Balanço implícito" valor={sinal(r.balancoKcalDia, 0, "kcal/dia")} />
        )}
        {r.ingestaoEstimadaKcal !== undefined && (
          <Linha
            rotulo="Ingestão estimada"
            valor={`${r.ingestaoEstimadaKcal} kcal/dia`}
            nota="gasto + balanço"
          />
        )}
      </dl>

      {r.avisos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {r.avisos.map((a) => (
            <li key={a} className="flex gap-2 text-xs leading-relaxed text-muted">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
              {a}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
