"use client";

import { useEffect, useRef, useState } from "react";
import { vincularImagensEmLote } from "@/lib/exercise-images";

// Importa em lote as imagens/GIFs de exercícios que o próprio usuário baixou,
// casando cada arquivo ao exercício pelo nome do arquivo. Evita o upload um a um.
export function ImportarImagens({ catalogo }: { catalogo: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pastaRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{
    vinculadas: number;
    total: number;
    naoCasadas: string[];
    ignorados: number;
  } | null>(null);

  // webkitdirectory permite escolher uma pasta inteira (Chromium/WebView Android);
  // não é tipado pelo React, então setamos via ref.
  useEffect(() => {
    if (pastaRef.current) {
      pastaRef.current.setAttribute("webkitdirectory", "");
      pastaRef.current.setAttribute("directory", "");
    }
  }, []);

  async function aoEscolher(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessando(true);
    setResultado(null);
    const r = await vincularImagensEmLote(Array.from(files), catalogo);
    setResultado(r);
    setProcessando(false);
  }

  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider">Imagens dos exercícios</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Baixe o pacote de demonstrações que você preferir e selecione todos os arquivos de uma
        vez — o app casa cada um ao exercício pelo nome do arquivo. Os arquivos ficam só no seu
        aparelho.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => aoEscolher(e.target.files)}
      />
      <input ref={pastaRef} type="file" hidden onChange={(e) => aoEscolher(e.target.files)} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={processando}
          className="rounded-2xl bg-accent py-3 text-sm font-bold text-bg active:scale-95 disabled:opacity-50"
        >
          {processando ? "Vinculando…" : "Escolher arquivos"}
        </button>
        <button
          onClick={() => pastaRef.current?.click()}
          disabled={processando}
          className="rounded-2xl border border-line py-3 text-sm font-bold text-accent active:scale-95 disabled:opacity-50"
        >
          Importar pasta
        </button>
      </div>

      {resultado && (
        <div className="mt-3 rounded-xl bg-bg/40 p-3 text-xs">
          <p className="font-semibold">
            {resultado.vinculadas} de {resultado.total} vinculadas
            {resultado.ignorados > 0 && (
              <span className="font-normal text-muted"> · {resultado.ignorados} não-imagem ignorados</span>
            )}
          </p>
          {resultado.naoCasadas.length > 0 && (
            <>
              <p className="mt-2 text-muted">Sem correspondência (renomeie p/ bater com o exercício):</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-muted">
                {resultado.naoCasadas.slice(0, 12).map((n) => (
                  <li key={n} className="truncate">• {n}</li>
                ))}
                {resultado.naoCasadas.length > 12 && (
                  <li>• +{resultado.naoCasadas.length - 12}…</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
