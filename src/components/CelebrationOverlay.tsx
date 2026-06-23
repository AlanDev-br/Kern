"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Capacitor } from "@capacitor/core";
import { useApp } from "@/lib/store";

async function vibrar() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([12, 40, 18]);
    }
  } catch {
    /* sem háptico disponível */
  }
}

function dispararConfete(corCustom?: string) {
  const cor =
    corCustom ||
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
    "#22c55e";
  confetti({
    particleCount: corCustom ? 140 : 90,
    spread: corCustom ? 100 : 75,
    origin: { y: 0.6 },
    colors: [cor, "#ffffff", "#f4f6fb"],
    scalar: corCustom ? 1.1 : 0.9,
  });
}

// Medalha estilizada para celebração de subida de tier. Disco metálico com a
// cor do tier, estrela central, brilho giratório e fitas.
function Medalha({ cor }: { cor: string }) {
  return (
    <div className="relative mx-auto mb-4 h-24 w-24">
      {/* fitas */}
      <div className="absolute left-1/2 top-1 h-10 w-3 -translate-x-5 rotate-12 rounded-sm bg-accent/70" />
      <div className="absolute left-1/2 top-1 h-10 w-3 translate-x-2 -rotate-12 rounded-sm bg-accent/70" />
      {/* disco */}
      <motion.div
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="absolute inset-x-0 bottom-0 mx-auto flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, #ffffff55, ${cor} 45%, ${cor}aa 100%)`,
          boxShadow: `0 0 0 3px ${cor}66, 0 0 24px ${cor}88`,
        }}
      >
        {/* brilho giratório */}
        <div
          className="absolute inset-0 animate-spin rounded-full opacity-50"
          style={{ background: `conic-gradient(from 0deg, transparent, #ffffffaa, transparent 35%)`, animationDuration: "3s" }}
        />
        <span className="relative text-3xl drop-shadow">★</span>
      </motion.div>
    </div>
  );
}

export function CelebrationOverlay() {
  const atual = useApp((s) => s.fila[0]);
  const proxima = useApp((s) => s.proximaCelebracao);

  useEffect(() => {
    if (!atual) return;
    dispararConfete(atual.tipo === "rank" ? atual.cor : undefined);
    vibrar();
    const t = setTimeout(() => proxima(), atual.tipo === "rank" ? 4200 : 3600);
    return () => clearTimeout(t);
  }, [atual, proxima]);

  return (
    <AnimatePresence>
      {atual && (
        <motion.button
          key={atual.titulo}
          onClick={proxima}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.7, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="glass glow-accent w-full max-w-xs rounded-3xl p-7 text-center"
          >
            {atual.tipo === "rank" ? (
              <Medalha cor={atual.cor ?? "#fbbf24"} />
            ) : (
              <div className="mx-auto mb-4 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-accent-soft text-4xl ring-accent-soft">
                {atual.icone}
              </div>
            )}
            <h2 className="text-xl font-bold text-gradient">{atual.titulo}</h2>
            <p className="mt-1 text-sm text-muted">{atual.subtitulo}</p>
            {atual.frase && (
              <p className="mt-4 border-t border-line pt-4 text-sm italic leading-relaxed text-fg/90">
                “{atual.frase}”
              </p>
            )}
            <p className="mt-5 text-[11px] uppercase tracking-widest text-muted">
              toque para continuar
            </p>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
