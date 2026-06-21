"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import {
  saudeNativa,
  statusSaude,
  pedirPermissoesSaude,
  lerSaudeHoje,
  type StatusSaude,
  type ResumoSaude,
} from "@/lib/health";

function hhmm(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataHora(d: Date) {
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function HealthSyncCard() {
  const marcarConcluida = useApp((s) => s.marcarConcluida);
  const [status, setStatus] = useState<StatusSaude>("indisponivel");
  const [resumo, setResumo] = useState<ResumoSaude | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhes, setDetalhes] = useState(false);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const st = await statusSaude();
      setStatus(st);
      if (st === "ok") {
        const r = await lerSaudeHoje();
        setResumo(r);
        if (r.acordouEm) await marcarConcluida("ineg-acordar");
        if (r.treinoSessoes > 0) await marcarConcluida("ineg-treino");
      }
    } finally {
      setSincronizando(false);
    }
  }, [marcarConcluida]);

  useEffect(() => {
    if (saudeNativa()) sincronizar();
  }, [sincronizar]);

  if (!saudeNativa()) {
    return (
      <div className="rounded-2xl border border-line bg-card/50 p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Importação automática de sono e treino disponível no app Android (via Health Connect).
        </p>
      </div>
    );
  }

  if (status === "sem-app") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Instale o app “Health Connect” pela Play Store pra eu ler seus dados.
        </p>
      </div>
    );
  }

  if (status === "sem-permissao") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Conectar Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Autorize a leitura de sono e exercício pra eu marcar acordar e treino sozinho.
        </p>
        <button
          onClick={async () => {
            await pedirPermissoesSaude();
            sincronizar();
          }}
          className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-bg active:scale-95"
        >
          Autorizar Health Connect
        </button>
      </div>
    );
  }

  if (status !== "ok") return null;

  return (
    <div className="glass overflow-hidden rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">⌚ Huawei Band — hoje</p>
        <button
          onClick={sincronizar}
          className="text-xs text-accent disabled:text-muted"
          disabled={sincronizando}
        >
          {sincronizando ? "lendo…" : "sincronizar"}
        </button>
      </div>

      {/* barra de progresso visível durante a leitura */}
      {sincronizando && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-full animate-pulse rounded-full bg-accent" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-bg/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted">Acordou</p>
          <p className="text-lg font-bold">
            {resumo?.acordouEm ? hhmm(resumo.acordouEm) : "—"}
          </p>
          {resumo && resumo.sonoMin > 0 && (
            <p className="text-[11px] text-muted">
              {Math.floor(resumo.sonoMin / 60)}h{String(resumo.sonoMin % 60).padStart(2, "0")} de sono
            </p>
          )}
        </div>
        <div className="rounded-xl border border-line bg-bg/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted">Treino</p>
          <p className="text-lg font-bold">
            {resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoMin} min` : "—"}
          </p>
          {resumo && resumo.treinoSessoes > 0 && (
            <p className="text-[11px] text-muted">{resumo.treinoSessoes} sessão(ões)</p>
          )}
        </div>
      </div>

      {resumo?.acordouEm && (
        <p className="mt-2 text-[11px] text-accent">✓ inegociáveis marcados automaticamente</p>
      )}

      {/* mensagens quando algo não veio */}
      {resumo && !resumo.acordouEm && resumo.ultimoSonoFim && (
        <p className="mt-2 text-[11px] text-muted">
          Último sono lido terminou {dataHora(resumo.ultimoSonoFim)} (não é de hoje).
        </p>
      )}
      {resumo && !resumo.acordouEm && !resumo.ultimoSonoFim && resumo.perms.sono && (
        <p className="mt-2 text-[11px] text-muted">
          Nenhum sono encontrado no Health Connect. Force um sync no Health Sync.
        </p>
      )}

      {/* diagnóstico expansível */}
      <button
        onClick={() => setDetalhes((d) => !d)}
        className="mt-3 text-[11px] text-muted underline"
      >
        {detalhes ? "ocultar diagnóstico" : "ver diagnóstico"}
      </button>
      {detalhes && resumo && (
        <div className="mt-2 space-y-0.5 rounded-xl border border-line bg-bg/40 p-3 text-[11px] text-muted">
          <p>Permissão sono: {resumo.perms.sono ? "sim" : "não"}</p>
          <p>Permissão treino: {resumo.perms.treino ? "sim" : "não"}</p>
          <p>Registros de sono lidos (36h): {resumo.sonoRegistros}</p>
          <p>Registros de treino lidos (hoje): {resumo.treinoRegistros}</p>
          <p>Último sono: {resumo.ultimoSonoFim ? dataHora(resumo.ultimoSonoFim) : "—"}</p>
          {resumo.erro && <p className="text-[#fb7185]">Erro: {resumo.erro}</p>}
          {!resumo.perms.treino && (
            <button
              onClick={async () => {
                await pedirPermissoesSaude();
                sincronizar();
              }}
              className="mt-1 text-accent underline"
            >
              autorizar exercício também
            </button>
          )}
        </div>
      )}
    </div>
  );
}
