"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useApp } from "@/lib/store";
import { calcularDirecao, ROTULO_FASE } from "@/lib/direcao-treino";
import { Icone } from "./Icone";

// A direção da semana, na tela de Treino.
//
// Antes daqui, o app mostrava volume por grupo com um rótulo ("baixo", "ok") e
// parava. Rótulo diz onde você está; não diz para onde ir nem quanto falta —
// e é por isso que a leitura ficava sem direção clara.
//
// A ordem aqui é deliberada: a fase primeiro, porque ela muda o significado de
// todo o resto. Depois as prioridades, que são no máximo três e trazem número.
// A tabela por grupo vem por último, para consulta, não como a mensagem.

export function DirecaoSemanal() {
  const { config } = useApp();
  const treinos = useLiveQuery(() => db.treinos.toArray(), []) ?? [];
  const medidas = useLiveQuery(() => db.medidasCorporais.orderBy("data").toArray(), []) ?? [];

  const d = calcularDirecao(treinos, config?.perfil, medidas);

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight">Direção da semana</h2>
        <span className="shrink-0 text-sm text-muted tabular-nums">
          {d.seriesTotais} séries
        </span>
      </div>

      <p className="mt-1 text-sm text-muted">
        {ROTULO_FASE[d.fase]} — {d.faseMotivo}.
        {d.fase === "deficit" && " O recurso escasso é recuperação: sustente o estímulo, não o aumente."}
        {d.fase === "superavit" && " É a janela de empurrar volume: há com que recuperar."}
      </p>

      <ol className="mt-4 space-y-2.5">
        {d.prioridades.map((p, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent tabular-nums">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed text-fg/90">{p}</p>
          </li>
        ))}
      </ol>

      {d.seriesTotais > 0 && (
        <details className="mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-accent">
            Volume por grupo
            <Icone nome="chevron" tamanho={16} />
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1.5 font-medium">Grupo</th>
                  <th className="pb-1.5 text-right font-medium">Semana</th>
                  <th className="pb-1.5 text-right font-medium">Alvo</th>
                  <th className="pb-1.5 text-right font-medium">Faixa</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.volume
                  .filter((v) => v.series > 0 || v.cronico)
                  .map((v) => {
                    const fora = v.series < v.mev || v.series > v.mrv;
                    return (
                      <tr key={v.grupo} className="border-t border-line/40">
                        <td className="py-1.5 font-medium">
                          {v.grupo}
                          {v.cronico && (
                            <span className="ml-1.5 text-sm text-muted">4 sem.</span>
                          )}
                        </td>
                        <td className={`py-1.5 text-right ${fora ? "font-bold text-accent" : ""}`}>
                          {v.series}
                        </td>
                        <td className="py-1.5 text-right text-muted">{v.alvo}</td>
                        <td className="py-1.5 text-right text-muted">
                          {v.mev}–{v.mrv}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">
              Faixa é MEV–MRV: abaixo do primeiro não há estímulo suficiente, acima do
              segundo o excedente cobra recuperação sem construir. &ldquo;4 sem.&rdquo; marca o
              grupo que está fora da faixa na média do mês, não só nesta semana.
            </p>
          </div>
        </details>
      )}
    </section>
  );
}
