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

function dispararConfete() {
  const cor = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim() || "#22c55e";
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors: [cor, "#ffffff", "#f4f6fb"],
    scalar: 0.9,
  });
}

export function CelebrationOverlay() {
  const atual = useApp((s) => s.fila[0]);
  const proxima = useApp((s) => s.proximaCelebracao);

  useEffect(() => {
    if (!atual) return;
    dispararConfete();
    vibrar();
    const t = setTimeout(() => proxima(), 3600);
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
            <div className="mx-auto mb-4 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-accent-soft text-4xl ring-accent-soft">
              {atual.icone}
            </div>
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
