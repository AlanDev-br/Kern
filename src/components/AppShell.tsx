"use client";

import { useEffect, useState, useCallback } from "react";
import { Icone } from "./Icone";
import { useApp } from "@/lib/store";
import { Navegacao } from "./Navegacao";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { AnimatePresence, motion } from "framer-motion";
import { APPS_SOCIAIS } from "@/lib/social-apps";
import { tempoTelaDisponivel, obterEstadoLimitador, limparAppBloqueado } from "@/lib/screen-time";

export function AppShell({ children }: { children: React.ReactNode }) {
  const carregado = useApp((s) => s.carregado);
  const carregar = useApp((s) => s.carregar);
  const [blockedApp, setBlockedApp] = useState<{ pkg: string; nome: string } | null>(null);

  const checkBlocked = useCallback(async () => {
    if (tempoTelaDisponivel()) {
      const state = await obterEstadoLimitador();
      if (state.lastBlockedApp) {
        const app = APPS_SOCIAIS.find((a) => a.pkg === state.lastBlockedApp) || {
          pkg: state.lastBlockedApp,
          nome: "Rede social",
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
        <p className="text-3xl font-extrabold tracking-tight text-acento">kern</p>
        <p className="text-sm text-muted">carregando seus dados</p>
      </div>
    );
  }

  // Até lg, coluna única centrada, como no celular. A partir de lg o padding
  // esquerdo abre espaço para a navegação lateral fixa (w-60 = 240px) e o
  // conteúdo perde o teto de 448px: quem passa a limitar a medida de linha é a
  // largura da COLUNA do painel, não a da página.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-none lg:pl-60">
      <main className="flex-1 px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] lg:mx-auto lg:w-full lg:max-w-[1500px] lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>
      <Navegacao />
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
              className="glass flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-line p-6 shadow-2xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icone nome="semCelular" tamanho={28} />
              </div>

              <h2 className="text-xl font-bold tracking-tight">Limite do dia alcançado</h2>

              <p className="text-sm text-muted">
                Você definiu um limite diário para o <strong>{blockedApp.nome}</strong> e ele foi alcançado.
              </p>

              <blockquote className="w-full rounded-xl border border-line bg-bg/40 p-3 text-xs leading-relaxed text-muted">
                Não acumule arrependimento. Acumule provas de promessas cumpridas.
              </blockquote>

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
