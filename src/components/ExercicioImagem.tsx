"use client";

import { useEffect, useState } from "react";
import { resolverImagem, buscarImagens, definirImagem } from "@/lib/exercise-images";
import { grupoDoExercicio } from "@/lib/musculacao";

export function ExercicioImagem({ nome, size = 64 }: { nome: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [opcoes, setOpcoes] = useState<{ nome: string; url: string }[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let vivo = true;
    resolverImagem(nome).then((u) => {
      if (vivo) setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [nome]);

  async function abrir() {
    setPicking(true);
    setCarregando(true);
    setOpcoes(await buscarImagens(nome, 8));
    setCarregando(false);
  }

  async function escolher(u: string) {
    await definirImagem(nome, u);
    setUrl(u);
    setPicking(false);
  }

  return (
    <>
      <button
        onClick={abrir}
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white"
        style={{ width: size, height: size }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-muted">
            {grupoDoExercicio(nome)}
          </span>
        )}
      </button>

      {picking && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/70 p-4"
          onClick={() => setPicking(false)}
        >
          <div
            className="glass max-h-[70vh] w-full overflow-y-auto rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold">Imagem de “{nome}”</p>
            <p className="mt-0.5 text-xs text-muted">Toque pra escolher a que melhor representa.</p>
            {carregando ? (
              <p className="py-6 text-center text-sm text-muted">Buscando…</p>
            ) : opcoes.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {opcoes.map((o) => (
                  <button
                    key={o.url}
                    onClick={() => escolher(o.url)}
                    className="overflow-hidden rounded-xl border border-line bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.url} alt={o.nome} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted">
                Sem imagem encontrada (precisa de internet na 1ª vez).
              </p>
            )}
            <button
              onClick={() => setPicking(false)}
              className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
