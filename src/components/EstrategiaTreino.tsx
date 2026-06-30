"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Estratégia do treino: deixa claro o plano 4x/semana, as PRIORIDADES atuais em
// destaque (com o porquê de cada conduta para crescer o músculo) e onde o cardio
// é contabilizado. Conteúdo de orientação — explica a lógica, não só o "o quê".

interface Prioridade {
  grupo: string;
  icone: string;
  meta: string;
  porque: string;
}

const PRIORIDADES: Prioridade[] = [
  {
    grupo: "Peito",
    icone: "🫁",
    meta: "~13 séries/semana, em 2 dias (A e D)",
    porque:
      "Volume é o principal motor da hipertrofia. Para um grupo em ênfase, levamos as séries para perto do teto produtivo (MAV) e dividimos em 2 sessões na semana — frequência 2x distribui melhor o estímulo e a recuperação do que tudo num dia só.",
  },
  {
    grupo: "Braços (bíceps + tríceps)",
    icone: "💪",
    meta: "~12 séries/semana cada, diretas + indiretas",
    porque:
      "Braço responde a volume direto. Além do que ele já recebe em costas (bíceps) e peito/ombro (tríceps), adicionamos séries isoladas em 2 dias. É o trabalho direto extra que puxa o grupo para a faixa de ênfase sem estourar a recuperação.",
  },
  {
    grupo: "Quadríceps",
    icone: "🦵",
    meta: "~11 séries/semana, composto + isolador",
    porque:
      "Combinamos um composto pesado (agachamento/leg press) para carga e um isolador (cadeira extensora) para tensão direta no quadríceps. O composto traz sobrecarga; o isolador garante volume específico no músculo-alvo.",
  },
];

const PRINCIPIOS = [
  {
    t: "Progressão dupla",
    d: "Bateu a meta de reps com o RIR alvo? Sobe a carga (ou +1 rep) na próxima. É a sobrecarga progressiva — sem ela, volume nenhum cresce músculo.",
  },
  {
    t: "Deixa 1–2 reps na reserva (RIR)",
    d: "Treinar perto da falha (não sempre nela) maximiza estímulo com fadiga gerenciável — você recupera e progride semana a semana.",
  },
  {
    t: "Ênfase = mais volume, não mais dias",
    d: "Priorizar peito/braço/quadríceps significa mais séries nesses grupos (rumo ao MAV), mantendo os demais na faixa mínima-produtiva (MEV). Tudo dentro de 4 treinos.",
  },
  {
    t: "Técnica e amplitude antes de peso",
    d: "Amplitude completa sob controle recruta mais fibras que peso jogado. Carga só sobe quando a execução se mantém limpa.",
  },
];

export function EstrategiaTreino() {
  const [aberto, setAberto] = useState(true);

  return (
    <section className="glass rounded-3xl p-5" style={{ boxShadow: "inset 0 0 0 1px var(--accent)" }}>
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Estratégia do treino</h2>
          <p className="text-[11px] text-muted">Plano 4x/semana · ênfase estética · o porquê de cada conduta</p>
        </div>
        <span className="text-lg text-muted">{aberto ? "−" : "+"}</span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* Split */}
              <div className="rounded-2xl bg-bg/40 p-3">
                <p className="text-xs font-bold">Divisão (4 dias)</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  <b className="text-fg">A</b> Peito+Tríceps · <b className="text-fg">B</b> Costas+Bíceps ·{" "}
                  <b className="text-fg">C</b> Pernas (quadríceps) · <b className="text-fg">D</b> Ombros+Braços+Peito.
                  Faça A→B→C→D, descansando quando precisar; peito e braços são atingidos 2x na semana.
                </p>
              </div>

              {/* Prioridades em destaque */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  ★ Prioridades agora (estética)
                </p>
                <div className="space-y-2">
                  {PRIORIDADES.map((p) => (
                    <div key={p.grupo} className="rounded-2xl border border-line p-3" style={{ borderColor: "var(--accent)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.icone}</span>
                        <span className="text-sm font-bold">{p.grupo}</span>
                        <span className="ml-auto text-[10px] font-semibold text-accent">{p.meta}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                        <b className="text-fg">Por quê: </b>{p.porque}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Princípios */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Como conduzir cada série</p>
                <ul className="space-y-2">
                  {PRINCIPIOS.map((p) => (
                    <li key={p.t} className="flex gap-2 text-[11px] leading-relaxed">
                      <span className="text-accent">•</span>
                      <span><b className="text-fg">{p.t}.</b> <span className="text-muted">{p.d}</span></span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cardio + onde conta */}
              <div className="rounded-2xl bg-bg/40 p-3">
                <p className="text-xs font-bold">🏃 Cardio — falso magro</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  <b className="text-fg">Protocolo:</b> 2–3x/semana, 25–35 min em Zona 2 (ritmo que dá pra conversar),
                  depois da musculação ou em dia separado. Recompõe (queima gordura) sem comer seu músculo. HIIT curto
                  opcional 1x, se a recuperação permitir.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  <b className="text-fg">Onde conta:</b> você marca o cardio na pulseira → entra pelo Health Connect e
                  fecha o inegociável <b className="text-fg">"Movimento do dia"</b> + conta como condicionamento. Ele{" "}
                  <b className="text-fg">não</b> entra no volume de força (o gráfico de séries é só de musculação) — isso
                  é proposital: cardio não constrói músculo, complementa.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
