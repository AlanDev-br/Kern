"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getMedidas } from "@/lib/db";
import { useApp } from "@/lib/store";
import {
  amostrasNoPeriodo,
  contagemPorTipo,
  disponibilidade,
  pedirPermissoes,
  permissoes,
  sincronizar,
  type EstadoSincronia,
  type SituacaoPermissoes,
} from "@/lib/kern-health";
import { consolidarDias, type DiaSaude } from "@/lib/saude-resumo";
import { analisarRecomposicao } from "@/lib/recomposicao";
import { CoberturaSaude } from "@/components/CoberturaSaude";
import { RecomposicaoCard } from "@/components/RecomposicaoCard";
import { IconeSincronizar } from "@/components/IconesSaude";

/**
 * Aba Dados — observabilidade da captura.
 *
 * Duas camadas, nesta ordem: primeiro o estado da própria captura, depois o que os
 * dados dizem. Parece invertido para um painel, mas não é: um número de sono errado
 * porque a permissão caiu e um número de sono errado porque a conta está errada
 * exigem ações opostas, e só a primeira camada distingue os dois.
 */

const DIAS_PADRAO = 35;
const DIAS_HISTORICO = 400;

function chaveDia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  return `${h}h${String(Math.round(min % 60)).padStart(2, "0")}`;
}

/** Uma célula de dado da tabela diária. Ausência vira travessão, nunca zero. */
function Celula({ v, sufixo }: { v?: number; sufixo?: string }) {
  return (
    <td className="num py-2 text-right text-sm tabular-nums">
      {v === undefined ? (
        <span className="text-muted">—</span>
      ) : (
        <>
          {v.toLocaleString("pt-BR")}
          {sufixo && <span className="ml-0.5 text-xs text-muted">{sufixo}</span>}
        </>
      )}
    </td>
  );
}

function TabelaDias({ dias }: { dias: DiaSaude[] }) {
  if (dias.length === 0) return null;
  const recentes = dias.slice(-7).reverse();

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-base font-bold">Últimos dias</h2>
      <div className="-mx-1 mt-3 overflow-x-auto">
        <table className="w-full min-w-[19rem] border-collapse">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 font-medium">Dia</th>
              <th className="py-2 text-right font-medium">Passos</th>
              <th className="py-2 text-right font-medium">Sono</th>
              <th className="py-2 text-right font-medium">FC rep.</th>
              <th className="py-2 text-right font-medium">kcal</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((d) => (
              <tr key={d.data} className="border-b border-line/50 last:border-b-0">
                <th scope="row" className="num py-2 text-left text-sm font-normal text-muted">
                  {d.data.slice(8)}/{d.data.slice(5, 7)}
                </th>
                <Celula v={d.passos} />
                <td className="num py-2 text-right text-sm tabular-nums">
                  {d.sonoMin === undefined ? (
                    <span className="text-muted">—</span>
                  ) : (
                    hhmm(d.sonoMin)
                  )}
                </td>
                <Celula v={d.fcRepouso} />
                <Celula v={d.kcalTotal} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DadosPage() {
  const perfil = useApp((s) => s.config?.perfil);

  const [status, setStatus] = useState<"ok" | "sem-app" | "precisa-atualizar" | "web" | null>(null);
  const [perms, setPerms] = useState<SituacaoPermissoes | null>(null);
  const [ocupado, setOcupado] = useState<null | "sincronizando" | "historico" | "permissao">(null);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);

  const estados = (useLiveQuery(() => db.saudeSync.toArray(), []) ?? []) as EstadoSincronia[];
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [dias, setDias] = useState<DiaSaude[]>([]);
  const [recomp, setRecomp] = useState<ReturnType<typeof analisarRecomposicao> | null>(null);

  const ultimaSync = useMemo(() => {
    const carimbos = estados.map((e) => e.ultimaTentativa).filter(Boolean).sort();
    return carimbos.length ? carimbos[carimbos.length - 1] : null;
  }, [estados]);

  const recarregar = useCallback(async () => {
    setContagens(await contagemPorTipo());

    // A janela de consolidação exclui as séries contínuas de propósito: a FC de
    // repouso do dia já vem do RestingHeartRate, e arrastar as amostras de FC de 40
    // dias para a memória só para exibir uma tabela de 7 linhas travaria a WebView.
    const amostras = await amostrasNoPeriodo(chaveDia(45), chaveDia(0));
    const consolidado = consolidarDias(amostras);
    setDias(consolidado);

    if (perfil) {
      const medidas = await getMedidas();
      setRecomp(analisarRecomposicao(medidas, perfil, consolidado));
    }
  }, [perfil]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const s = await disponibilidade();
      if (!vivo) return;
      setStatus(s);
      if (s === "ok") setPerms(await permissoes());
      await recarregar();
    })();
    return () => {
      vivo = false;
    };
  }, [recarregar]);

  async function conceder() {
    setOcupado("permissao");
    try {
      setPerms(await pedirPermissoes());
    } finally {
      setOcupado(null);
    }
  }

  async function sincronizarAgora(dias: number) {
    setOcupado(dias > DIAS_PADRAO ? "historico" : "sincronizando");
    setUltimoErro(null);
    try {
      await sincronizar(dias);
      setPerms(await permissoes());
      await recarregar();
    } catch (e) {
      setUltimoErro((e as Error)?.message ?? String(e));
    } finally {
      setOcupado(null);
    }
  }

  const totalAmostras = Object.values(contagens).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Dados</h1>
        <p className="text-sm text-muted">
          O que a pulseira e a balança medem, e o que isso significa junto.
        </p>
      </header>

      {/* ── Camada 1: estado da captura ── */}
      <section className="glass rounded-2xl p-5">
        {status === null && <p className="text-sm text-muted">verificando o aparelho…</p>}

        {status === "web" && (
          <>
            <h2 className="text-base font-bold">Só no aplicativo</h2>
            <p className="mt-2 text-sm text-muted">
              A leitura da pulseira passa pelo Health Connect, que é do Android. No
              navegador esta tela fica vazia por natureza, não por erro — abra o Kern
              instalado no celular.
            </p>
          </>
        )}

        {status === "sem-app" && (
          <>
            <h2 className="text-base font-bold">Health Connect não encontrado</h2>
            <p className="mt-2 text-sm text-muted">
              Instale o Health Connect e ligue a sincronização dele no Mi Fitness. É por
              lá que a Mi Band 10 entrega os dados; o Kern só lê o que já chegou.
            </p>
          </>
        )}

        {status === "precisa-atualizar" && (
          <>
            <h2 className="text-base font-bold">Health Connect desatualizado</h2>
            <p className="mt-2 text-sm text-muted">
              A versão instalada é anterior à que o Kern usa. Atualize pela Play Store e
              volte aqui.
            </p>
          </>
        )}

        {status === "ok" && perms && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold">Captura</h2>
                <p className="mt-1 text-sm text-muted">
                  {perms.concedidos} de {perms.total} tipos autorizados
                  {perms.historico ? " · histórico completo" : " · só os últimos 30 dias"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => sincronizarAgora(DIAS_PADRAO)}
                disabled={ocupado !== null}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-bg transition-transform active:scale-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <IconeSincronizar
                  className={`h-4 w-4 ${ocupado === "sincronizando" ? "animate-spin" : ""}`}
                />
                {ocupado === "sincronizando" ? "lendo…" : "Sincronizar"}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/60 pt-3 text-sm">
              <dt className="text-muted">Última leitura</dt>
              <dd className="num text-right">
                {ultimaSync
                  ? new Date(ultimaSync).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "nunca"}
              </dd>
              <dt className="text-muted">Registros guardados</dt>
              <dd className="num text-right">{totalAmostras.toLocaleString("pt-BR")}</dd>
            </dl>

            {perms.concedidos < perms.total && (
              <button
                type="button"
                onClick={conceder}
                disabled={ocupado !== null}
                className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold transition-colors hover:border-accent disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {ocupado === "permissao" ? "abrindo…" : "Revisar permissões"}
              </button>
            )}

            {perms.historico && (
              <button
                type="button"
                onClick={() => sincronizarAgora(DIAS_HISTORICO)}
                disabled={ocupado !== null}
                className="mt-2 w-full rounded-xl border border-line py-2.5 text-sm font-semibold transition-colors hover:border-accent disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {ocupado === "historico" ? "importando…" : "Importar histórico completo"}
              </button>
            )}

            {ultimoErro && (
              <p className="mt-3 text-sm text-amber-400">
                A leitura parou: {ultimoErro}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Camada 2: o que os dados dizem ── */}
      {status === "ok" && totalAmostras === 0 && ultimaSync && (
        <section className="glass rounded-2xl p-5">
          <h2 className="text-base font-bold">Nada chegou ainda</h2>
          <p className="mt-2 text-sm text-muted">
            A leitura rodou e não achou registro nenhum. Abra o Mi Fitness, sincronize a
            pulseira e confirme que ele está autorizado a escrever no Health Connect —
            o Kern lê o Health Connect, não a pulseira.
          </p>
        </section>
      )}

      {recomp && totalAmostras > 0 && <RecomposicaoCard r={recomp} />}
      {dias.length > 0 && <TabelaDias dias={dias} />}

      {status === "ok" && estados.length > 0 && (
        <CoberturaSaude estados={estados} contagens={contagens} />
      )}
    </div>
  );
}
