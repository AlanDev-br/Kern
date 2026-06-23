"use client";

import { useRef, useState } from "react";
import { vincularImagensEmLote } from "@/lib/exercise-images";

// Importa em lote as imagens/GIFs de exercícios que o próprio usuário baixou,
// casando cada arquivo ao exercício pelo nome do arquivo. Evita o upload um a um.
export function ImportarImagens({ catalogo }: { catalogo: string[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<{
    vinculadas: number;
    total: number;
    naoCasadas: string[];
  } | null>(null);

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
      <button
        onClick={() => fileRef.current?.click()}
        disabled={processando}
        className="mt-3 w-full rounded-2xl bg-accent py-3 font-bold text-bg active:scale-95 disabled:opacity-50"
      >
        {processando ? "Vinculando…" : "Importar imagens em lote"}
      </button>

      {resultado && (
        <div className="mt-3 rounded-xl bg-bg/40 p-3 text-xs">
          <p className="font-semibold">
            {resultado.vinculadas} de {resultado.total} vinculadas
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
