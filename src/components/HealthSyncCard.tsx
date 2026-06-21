"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import {
  saudeNativa,
  statusSaude,
  pedirPermissoesSaude,
  lerSaudeHoje,
  todasPermissoes,
  type StatusSaude,
  type ResumoSaude,
} from "@/lib/health";

function hhmm(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataHora(d: Date) {
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Tile({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-lg font-bold">{valor}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
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

  async function autorizar() {
    await pedirPermissoesSaude();
    sincronizar();
  }

  if (!saudeNativa()) {
    return (
      <div className="rounded-2xl border border-line bg-card/50 p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Importação automática de sono, treino, passos e FC disponível no app Android (via Health Connect).
        </p>
      </div>
    );
  }

  if (status === "sem-app") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          O Health Connect não está disponível neste aparelho.
        </p>
      </div>
    );
  }

  if (status === "sem-permissao") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Conectar Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Autorize a leitura no Health Connect pra eu acompanhar sono, treino, passos e FC.
        </p>
        <button
          onClick={autorizar}
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

      {sincronizando && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-full animate-pulse rounded-full bg-accent" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile
          label="Acordou"
          valor={resumo?.acordouEm ? hhmm(resumo.acordouEm) : "—"}
          sub={
            resumo && resumo.sonoMin > 0
              ? `${Math.floor(resumo.sonoMin / 60)}h${String(resumo.sonoMin % 60).padStart(2, "0")} de sono`
              : undefined
          }
        />
        <Tile
          label="Treino"
          valor={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoMin} min` : "—"}
          sub={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoSessoes} sessão(ões)` : undefined}
        />
        <Tile
          label="Passos"
          valor={resumo && resumo.passos > 0 ? resumo.passos.toLocaleString("pt-BR") : "—"}
        />
        <Tile
          label="FC repouso"
          valor={resumo?.fcRepouso ? `${resumo.fcRepouso} bpm` : "—"}
        />
      </div>

      {resumo?.acordouEm && (
        <p className="mt-2 text-[11px] text-accent">✓ inegociáveis marcados automaticamente</p>
      )}

      {/* avisos sobre o sono (que costuma não vir da Huawei) */}
      {resumo && !resumo.acordouEm && resumo.ultimoSonoFim && (
        <p className="mt-2 text-[11px] text-muted">
          Último sono lido terminou {dataHora(resumo.ultimoSonoFim)} (não é de hoje).
        </p>
      )}
      {resumo && !resumo.acordouEm && !resumo.ultimoSonoFim && resumo.perms.sono && (
        <p className="mt-2 text-[11px] text-muted">
          O Health Connect ainda não recebeu seu sono (o Health Sync da Huawei costuma
          não enviar sono). Marque “acordar” manualmente se precisar.
        </p>
      )}

      {/* libera permissões que faltam (ex.: passos e FC recém-adicionados) */}
      {resumo && !todasPermissoes(resumo.perms) && (
        <button onClick={autorizar} className="mt-3 w-full rounded-xl border border-line py-2 text-xs font-semibold active:scale-95">
          Autorizar leituras que faltam
        </button>
      )}

      <button
        onClick={() => setDetalhes((d) => !d)}
        className="mt-3 text-[11px] text-muted underline"
      >
        {detalhes ? "ocultar diagnóstico" : "ver diagnóstico"}
      </button>
      {detalhes && resumo && (
        <div className="mt-2 space-y-0.5 rounded-xl border border-line bg-bg/40 p-3 text-[11px] text-muted">
          <p>Permissões — sono: {resumo.perms.sono ? "sim" : "não"} · treino: {resumo.perms.treino ? "sim" : "não"} · passos: {resumo.perms.passos ? "sim" : "não"} · FC: {resumo.perms.fc ? "sim" : "não"}</p>
          <p>Sono lido (36h): {resumo.sonoRegistros} registros</p>
          <p>Treino lido (hoje): {resumo.treinoRegistros} registros</p>
          <p>Passos hoje: {resumo.passos}</p>
          <p>FC repouso: {resumo.fcRepouso ?? "—"}</p>
          <p>Último sono: {resumo.ultimoSonoFim ? dataHora(resumo.ultimoSonoFim) : "—"}</p>
          {resumo.erro && <p className="text-[#fb7185]">Erro: {resumo.erro}</p>}
        </div>
      )}
    </div>
  );
}
