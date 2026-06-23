"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Orientação de periodização para natural, fundamentada na literatura (não nos
// materiais de nenhum método específico). Ideia central validada por meta-análises:
// o volume é o principal motor da hipertrofia, mas com retornos decrescentes; e o
// ESTILO de periodização importa pouco quando o volume é igualado — então, para
// natural, o que decide é progressão de volume/carga + recuperação, não o esquema
// da moda. As faixas MEV–MRV são heurísticas úteis, não constantes fixas.

interface SemanaMeso {
  semana: string;
  volume: string;
  rir: string;
  nota: string;
}

const MESOCICLO: SemanaMeso[] = [
  { semana: "1", volume: "base (perto do MEV)", rir: "3–4", nota: "Entra leve, foco em técnica e conexão." },
  { semana: "2", volume: "+2 a 4 séries/grupo", rir: "2–3", nota: "Sobe carga ou reps onde bateu a meta." },
  { semana: "3", volume: "rumo ao MAV", rir: "1–2", nota: "Volume produtivo; mantém a progressão." },
  { semana: "4", volume: "pico (perto do MRV)", rir: "0–1", nota: "Semana mais dura — fadiga alta é esperada." },
  { semana: "5", volume: "deload (~50%)", rir: "4–5", nota: "Recupera e supercompensa. Não pule." },
];

const PRINCIPIOS = [
  "Volume é o principal motor do crescimento — mas com retornos decrescentes: mais séries ajudam até um ponto, depois viram fadiga sem ganho extra.",
  "Progride por dupla progressão: bateu a meta de reps no RIR alvo, sobe carga ou reps na próxima.",
  "Frequência 2×/semana por grupo distribui melhor o volume do que tudo num dia só.",
  "Autorregule pelo RIR (reps na reserva): se a barra voa, falta estímulo; se trava cedo demais, recue.",
  "Deload quando a fadiga acumula (sono ruim, cargas caindo, juntas doendo) — não é fraqueza, é o que permite o próximo ciclo render.",
  "O estilo de periodização (linear, ondulatória) importa pouco quando o volume é igualado. Para natural, priorize volume na faixa certa, progressão e recuperação — não o esquema da moda.",
];

export function Periodizacao() {
  const [aberto, setAberto] = useState(false);

  return (
    <section className="glass rounded-3xl p-5">
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Periodização (natural)</h2>
          <p className="text-[11px] text-muted">mesociclo de 5 semanas · baseado em evidência</p>
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
            <div className="pt-4">
              {/* Mesociclo */}
              <div className="space-y-1.5">
                {MESOCICLO.map((s) => {
                  const deload = s.semana === "5";
                  return (
                    <div
                      key={s.semana}
                      className="flex items-center gap-3 rounded-xl bg-bg/40 p-2.5"
                      style={deload ? { boxShadow: "inset 0 0 0 1px var(--accent)" } : undefined}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                          background: deload ? "var(--accent)" : "rgba(255,255,255,0.06)",
                          color: deload ? "var(--bg)" : "var(--fg)",
                        }}
                      >
                        {s.semana}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{s.volume}</p>
                        <p className="text-[11px] text-muted">{s.nota}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">RIR {s.rir}</span>
                    </div>
                  );
                })}
              </div>

              {/* Princípios */}
              <h3 className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted">Princípios</h3>
              <ul className="space-y-2">
                {PRINCIPIOS.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-fg/90">
                    <span className="text-accent">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[10px] leading-relaxed text-muted">
                Base: meta-análises de dose-resposta de volume (Pelland et al., 2025; Schoenfeld et al., 2017)
                e de periodização linear vs. ondulatória (Grgic et al., 2017). MEV–MAV–MRV são heurísticas de
                referência, não constantes fixas — ajuste pela sua recuperação.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
