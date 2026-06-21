"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { BottomNav } from "./BottomNav";
import { CelebrationOverlay } from "./CelebrationOverlay";

export function AppShell({ children }: { children: React.ReactNode }) {
  const carregado = useApp((s) => s.carregado);
  const carregar = useApp((s) => s.carregar);

  useEffect(() => {
    carregar();
  }, [carregar]);

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
    </div>
  );
}
