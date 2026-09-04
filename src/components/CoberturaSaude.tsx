"use client";

import { useState } from "react";
import {
  ROTULO_GRUPO,
  ROTULO_TIPO,
  TIPOS_SAUDE,
  amostrasDoTipo,
  type AmostraSaude,
  type EstadoSincronia,
  type GrupoSaude,
  type TipoSaude,
} from "@/lib/kern-health";
import { ICONE_GRUPO, IconeSeta } from "./IconesSaude";

/**
 * O que a Mi Band 10 realmente publica, tipo a tipo — e, embaixo de cada tipo, os
 * registros como chegaram.
 *
 * Por que o cru fica na tela em vez de virar só painel: o protocolo da balança foi
 * validado assim, mostrando o hex ao lado do valor interpretado, com o corpo em cima
 * dela. Aqui o problema é o mesmo. Nenhuma documentação diz o que o Mi Fitness
 * escreve no Health Connect nesta versão, neste aparelho, nesta região — só o
 * aparelho diz. E quando um número aparecer errado num painel, é aqui que se
 * descobre se o erro é da conta ou do dado.
 */

type Estado = "sem-permissao" | "sem-dado" | "erro" | "ok";

function estadoDo(sync: EstadoSincronia | undefined, contagem: number): Estado {
  if (sync?.erro) return "erro";
  if (sync && !sync.permitido) return "sem-permissao";
  if (contagem === 0) return "sem-dado";
  return "ok";
}

const TEXTO_ESTADO: Record<Estado, string> = {
  // "Sem permissão" e "sem dado" são fatos diferentes: um é decisão sua, o outro é
  // decisão da Xiaomi. Misturar os dois num "—" apaga justamente o que se quer saber.
  "sem-permissao": "sem permissão",
  "sem-dado": "permitido, sem dado",
  erro: "erro na leitura",
  ok: "",
};

const COR_PONTO: Record<Estado, string> = {
  "sem-permissao": "bg-line",
  "sem-dado": "bg-muted/50",
  erro: "bg-amber-400",
  ok: "bg-accent",
};

function horaCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LinhaCrua({ a }: { a: AmostraSaude }) {
  const [aberto, setAberto] = useState(false);
  const temExtra = Object.keys(a.extra ?? {}).length > 0;

  return (
    <li className="border-t border-line/50 py-2 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="num text-xs text-muted">{horaCurta(a.inicio)}</span>
        <span className="num text-sm font-semibold">
          {a.valor !== undefined ? `${a.valor.toLocaleString("pt-BR")} ${a.unidade ?? ""}` : "—"}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-3">
        <span className="truncate text-xs text-muted">
          {a.dispositivo ? `${a.dispositivo} · ` : ""}
          {a.origem}
        </span>
        {temExtra && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {aberto ? "ocultar bruto" : "ver bruto"}
          </button>
        )}
      </div>
      {aberto && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-bg/70 p-2.5 text-xs leading-relaxed text-muted">
          {JSON.stringify(a.extra, null, 2)}
        </pre>
      )}
    </li>
  );
}

function LinhaTipo({
  tipo,
  sync,
  contagem,
}: {
  tipo: TipoSaude;
  sync?: EstadoSincronia;
  contagem: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [amostras, setAmostras] = useState<AmostraSaude[] | null>(null);
  const estado = estadoDo(sync, contagem);
  const podeAbrir = contagem > 0;

  async function alternar() {
    const novo = !aberto;
    setAberto(novo);
    if (novo && amostras === null) setAmostras(await amostrasDoTipo(tipo, 12));
  }

  return (
    <li className="border-t border-line/60 first:border-t-0">
      <button
        type="button"
        onClick={podeAbrir ? alternar : undefined}
        aria-expanded={podeAbrir ? aberto : undefined}
        disabled={!podeAbrir}
        className="flex w-full items-center gap-3 py-2.5 text-left transition-opacity disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${COR_PONTO[estado]}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{ROTULO_TIPO[tipo].nome}</span>
          {estado !== "ok" && (
            <span className="block text-xs text-muted">
              {sync?.erro ?? TEXTO_ESTADO[estado]}
            </span>
          )}
        </span>
        <span className="num shrink-0 text-sm text-muted">
          {contagem > 0 ? contagem.toLocaleString("pt-BR") : ""}
        </span>
        {podeAbrir && (
          <IconeSeta
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              aberto ? "rotate-90" : ""
            }`}
          />
        )}
      </button>

      {aberto && (
        <div className="pb-3 pl-4.5">
          {amostras === null ? (
            <p className="text-xs text-muted">carregando…</p>
          ) : (
            <ul className="rounded-lg border border-line/60 px-3">
              {amostras.map((a) => (
                <LinhaCrua key={a.id} a={a} />
              ))}
            </ul>
          )}
          {sync?.truncado && (
            <p className="mt-2 text-xs text-muted">
              A leitura bateu no teto de amostras deste tipo — há mais dado no aparelho
              do que o guardado aqui.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function CoberturaSaude({
  estados,
  contagens,
}: {
  estados: EstadoSincronia[];
  contagens: Record<string, number>;
}) {
  const porTipo = new Map(estados.map((e) => [e.tipo, e]));
  const grupos = [...new Set(TIPOS_SAUDE.map((t) => ROTULO_TIPO[t].grupo))] as GrupoSaude[];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold">Cobertura</h2>
        <p className="mt-1 text-sm text-muted">
          O que o aparelho publica, tipo a tipo. Toque num que tenha registros para ver
          como o dado chegou.
        </p>
      </div>

      {grupos.map((g) => {
        const tipos = TIPOS_SAUDE.filter((t) => ROTULO_TIPO[t].grupo === g);
        const comDado = tipos.filter((t) => (contagens[t] ?? 0) > 0).length;
        const Icone = ICONE_GRUPO[g];

        return (
          <div key={g} className="glass rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2.5 pb-1">
              <Icone className="h-5 w-5 text-accent" />
              <h3 className="flex-1 text-sm font-semibold">{ROTULO_GRUPO[g]}</h3>
              <span className="num text-xs text-muted">
                {comDado}/{tipos.length}
              </span>
            </div>
            <ul>
              {tipos.map((t) => (
                <LinhaTipo
                  key={t}
                  tipo={t}
                  sync={porTipo.get(t)}
                  contagem={contagens[t] ?? 0}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
