"use client";

import { useEffect, useState } from "react";
import { gerarParecerSeNecessario } from "@/lib/parecer";
import type { ParecerDiario } from "@/lib/db";
import { Icone } from "./Icone";

// A leitura que a IA faz de ontem, no topo da Hoje.
//
// A chamada é adiada para a ociosidade: ela atravessa a rede e não pode entrar
// no caminho da primeira pintura. `timeout` porque aparelho lento pode nunca
// ficar realmente ocioso, e o setTimeout de reserva porque o Safari não
// implementa requestIdleCallback.
//
// Enquanto não há parecer, o componente não renderiza nada — nem esqueleto, nem
// "carregando". Um bloco reservado para um texto que talvez nunca chegue (sem
// chave, sem rede, sem dado de ontem) empurraria o conteúdo real para baixo em
// troca de nada.
export function ParecerCard() {
  const [parecer, setParecer] = useState<ParecerDiario | null>(null);

  useEffect(() => {
    let vivo = true;
    const rodar = () => {
      gerarParecerSeNecessario().then((p) => {
        if (vivo && p) setParecer(p);
      });
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }).requestIdleCallback;

    let idA: number | undefined;
    const idB = window.setTimeout(rodar, 3000);
    if (ric) idA = ric(() => { window.clearTimeout(idB); rodar(); }, { timeout: 2000 });

    return () => {
      vivo = false;
      window.clearTimeout(idB);
      if (idA !== undefined) {
        (window as unknown as { cancelIdleCallback?: (id: number) => void })
          .cancelIdleCallback?.(idA);
      }
    };
  }, []);

  if (!parecer) return null;

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-accent">
        <Icone nome="coach" tamanho={16} />
        <h2 className="text-sm font-semibold">A leitura de ontem</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg/90">{parecer.texto}</p>
    </section>
  );
}
