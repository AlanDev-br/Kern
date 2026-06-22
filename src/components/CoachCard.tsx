"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { gerarDirecionamentos, type Severidade } from "@/lib/coach";

const COR: Record<Severidade, { borda: string; chip: string; texto: string }> = {
  critico: { borda: "#fb7185", chip: "rgba(251,113,133,0.15)", texto: "#fb7185" },
  atencao: { borda: "var(--accent)", chip: "rgba(var(--glow),0.15)", texto: "var(--accent)" },
  bom: { borda: "var(--line)", chip: "rgba(var(--glow),0.12)", texto: "var(--accent)" },
};

const ROTULO: Record<Severidade, string> = {
  critico: "Atenção máxima",
  atencao: "Ajuste hoje",
  bom: "No caminho",
};

export function CoachCard() {
  const dias = useApp((s) => s.dias);
  const diaHoje = useApp((s) => s.diaHoje);
  const ctx = useApp((s) => s.ctx);
  const [abrir, setAbrir] = useState(false);

  const direcoes = useMemo(
    () => gerarDirecionamentos({ dias, diaHoje, ctx }),
    [dias, diaHoje, ctx],
  );
  const principal = direcoes[0];
  const extras = direcoes.slice(1);

  if (!principal) return null;
  const cor = COR[principal.severidade];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${cor.borda}` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{principal.icone}</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: cor.chip, color: cor.texto }}
        >
          {ROTULO[principal.severidade]}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted">
          Direcionamento de hoje
        </span>
      </div>

      <h2 className="mt-3 text-lg font-bold leading-tight">{principal.titulo}</h2>
      <p className="mt-1.5 text-sm text-fg/90">{principal.acao}</p>
      <p className="mt-3 border-t border-line pt-3 text-sm italic leading-relaxed text-muted">
        “{principal.frase}”
      </p>

      {extras.length > 0 && (
        <>
          <button
            onClick={() => setAbrir((v) => !v)}
            className="mt-3 text-[11px] text-accent underline"
          >
            {abrir ? "ocultar" : `mais ${extras.length} ${extras.length === 1 ? "ponto" : "pontos"} de atenção`}
          </button>
          {abrir && (
            <ul className="mt-2 space-y-2">
              {extras.map((d) => (
                <li key={d.id} className="flex gap-2 text-xs">
                  <span>{d.icone}</span>
                  <span>
                    <span className="font-semibold">{d.titulo}.</span>{" "}
                    <span className="text-muted">{d.acao}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </motion.section>
  );
}
