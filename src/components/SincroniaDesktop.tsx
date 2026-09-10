"use client";

import { useEffect, useState } from "react";
import { aplicarInstantaneo, type Instantaneo, type ResumoInstantaneo } from "@/lib/instantaneo";
import { useApp } from "@/lib/store";
import { Icone } from "./Icone";

// A tela de recepção, que só existe dentro do executável.
//
// Ela não aparece no navegador nem no celular: `window.kernDesktop` só é
// injetado pelo preload do Electron. Um cartão pedindo "código de pareamento"
// no celular seria mentira — lá o gesto é enviar, não receber.

interface PonteDesktop {
  presente: boolean;
  dadosDeRede(): Promise<{ codigo: string; porta: number; enderecos: { nome: string; endereco: string }[] }>;
  aoReceberInstantaneo(cb: (i: Instantaneo) => void): () => void;
}

function ponte(): PonteDesktop | null {
  const w = window as unknown as { kernDesktop?: PonteDesktop };
  return w.kernDesktop?.presente ? w.kernDesktop : null;
}

export function SincroniaDesktop() {
  const [rede, setRede] = useState<{ codigo: string; porta: number; enderecos: { nome: string; endereco: string }[] } | null>(null);
  const [estado, setEstado] = useState<"esperando" | "aplicando" | "pronto" | "erro">("esperando");
  const [resumo, setResumo] = useState<ResumoInstantaneo[]>([]);
  const [erro, setErro] = useState("");
  const carregar = useApp((s) => s.carregar);

  useEffect(() => {
    const p = ponte();
    if (!p) return;

    p.dadosDeRede().then(setRede).catch(() => {});

    // A função devolvida cancela a assinatura. Sem ela, remontar a tela
    // acumularia ouvintes e o mesmo instantâneo seria aplicado várias vezes.
    return p.aoReceberInstantaneo(async (inst) => {
      setEstado("aplicando");
      try {
        const r = await aplicarInstantaneo(inst);
        setResumo(r);
        setEstado("pronto");
        // O app inteiro relê do banco: sem isto a tela continuaria mostrando o
        // estado anterior, e o usuário concluiria que a sincronia não funcionou.
        await carregar();
      } catch (e) {
        setErro((e as Error)?.message ?? "falha ao aplicar");
        setEstado("erro");
      }
    });
  }, [carregar]);

  if (!ponte()) return null;

  const total = resumo.reduce((s, t) => s + t.registros, 0);

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-accent">
        <Icone nome="trocar" tamanho={18} />
        <h2 className="text-base font-bold tracking-tight">Receber do celular</h2>
      </div>

      {estado === "pronto" ? (
        <>
          <p className="mt-2 text-sm text-fg/90">
            Recebido. {total.toLocaleString("pt-BR")} registros em {resumo.length} tabelas.
          </p>
          <p className="mt-1 text-xs text-muted">
            Envie de novo quando quiser: o computador sempre fica igual ao celular.
          </p>
        </>
      ) : estado === "aplicando" ? (
        <p className="mt-2 text-sm text-muted">Gravando o que chegou…</p>
      ) : estado === "erro" ? (
        <p className="mt-2 text-sm text-rose-400">Não consegui aplicar: {erro}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            No celular, abra <strong className="text-fg">Perfil → Enviar para o computador</strong> e
            use estes dados. Os dois precisam estar no mesmo Wi-Fi.
          </p>

          <dl className="mt-4 space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">Endereço</dt>
              <dd className="text-base font-bold tabular-nums">
                {rede?.enderecos.length
                  ? `${rede.enderecos[0].endereco}:${rede.porta}`
                  : "procurando a rede…"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">Código</dt>
              <dd className="text-base font-bold tracking-[0.2em] tabular-nums">
                {rede?.codigo ?? "······"}
              </dd>
            </div>
          </dl>

          {rede && rede.enderecos.length > 1 && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Se não conectar, tente outro endereço desta máquina:{" "}
              {rede.enderecos.slice(1).map((e) => `${e.endereco} (${e.nome})`).join(", ")}.
            </p>
          )}

          <p className="mt-3 text-xs leading-relaxed text-muted">
            O código muda toda vez que você abre o Kern aqui — não é senha guardada.
          </p>
        </>
      )}
    </section>
  );
}
