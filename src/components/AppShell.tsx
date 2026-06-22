"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/store";
import { BottomNav } from "./BottomNav";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { AnimatePresence, motion } from "framer-motion";
import { APPS_SOCIAIS } from "@/lib/social-apps";
import { tempoTelaDisponivel, obterEstadoLimitador, limparAppBloqueado } from "@/lib/screen-time";

export function AppShell({ children }: { children: React.ReactNode }) {
  const carregado = useApp((s) => s.carregado);
  const carregar = useApp((s) => s.carregar);
  const [blockedApp, setBlockedApp] = useState<{ pkg: string; nome: string; icone: string } | null>(null);

  const checkBlocked = useCallback(async () => {
    if (tempoTelaDisponivel()) {
      const state = await obterEstadoLimitador();
      if (state.lastBlockedApp) {
        const app = APPS_SOCIAIS.find((a) => a.pkg === state.lastBlockedApp) || {
          pkg: state.lastBlockedApp,
          nome: "Rede Social",
          icone: "📵",
        };
        setBlockedApp(app);
      }
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    checkBlocked();

    const onVisivel = () => {
      if (document.visibilityState === "visible") checkBlocked();
    };
    document.addEventListener("visibilitychange", onVisivel);
    return () => document.removeEventListener("visibilitychange", onVisivel);
  }, [checkBlocked]);

  async function desativarBloqueio() {
    await limparAppBloqueado();
    setBlockedApp(null);
  }

  if (!carregado) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <div className="h-14 w-14 animate-float rounded-2xl bg-accent-soft ring-accent-soft" />
        <p className="text-3xl font-extrabold tracking-tight text-gradient">kern</p>
        <p className="text-sm text-muted">construindo sua prova...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomNav />
      <CelebrationOverlay />

      <AnimatePresence>
        {blockedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg/95 backdrop-blur-lg px-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass max-w-sm rounded-3xl p-6 shadow-2xl border border-line flex flex-col items-center gap-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-3xl animate-bounce">
                {blockedApp.icone}
              </div>
              
              <h2 className="text-xl font-bold tracking-tight">Limite Atingido!</h2>
              
              <p className="text-sm text-muted">
                Você definiu um limite diário para o <strong>{blockedApp.nome}</strong> e ele foi alcançado.
              </p>
              
              <div className="w-full rounded-xl bg-bg/40 border border-line p-3 text-xs text-muted leading-relaxed">
                "Não acumule arrependimento. Acumule provas de promessas cumpridas."
              </div>

              <button
                onClick={desativarBloqueio}
                className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-bold text-bg active:scale-95 transition-transform"
              >
                Entendido, voltar ao foco
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
