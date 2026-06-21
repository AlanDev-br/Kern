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
  type OrigemAcordar,
} from "@/lib/health";

function hhmm(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataHora(d: Date) {
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function rotuloOrigem(o: OrigemAcordar): string {
  if (o === "fc+passos") return "estimado por FC + passos";
  if (o === "fc") return "estimado por FC";
  if (o === "passos") return "estimado por passos";
  if (o === "sono") return "do sono";
  return "";
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
  const setAcordarManual = useApp((s) => s.setAcordarManual);
  const acordarManual = useApp((s) => s.diaHoje.acordarManual);

  const [status, setStatus] = useState<StatusSaude>("indisponivel");
  const [resumo, setResumo] = useState<ResumoSaude | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [editandoHora, setEditandoHora] = useState(false);
  const [horaInput, setHoraInput] = useState("06:30");

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const st = await statusSaude();
      setStatus(st);
      if (st === "ok") {
        const r = await lerSaudeHoje();
        setResumo(r);
        if (r.acordouEm || r.acordarEstimado) await marcarConcluida("ineg-acordar");
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

  async function salvarHora() {
    await setAcordarManual(horaInput);
    setEditandoHora(false);
  }

  if (!saudeNativa()) {
    return (
      <div className="rounded-2xl border border-line bg-card/50 p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Importação automática de treino, passos, FC e estimativa de despertar disponível no app Android.
        </p>
      </div>
    );
  }

  if (status === "sem-app") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">O Health Connect não está disponível neste aparelho.</p>
      </div>
    );
  }

  if (status === "sem-permissao") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">⌚ Conectar Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Autorize a leitura no Health Connect pra eu estimar seu despertar e acompanhar treino, passos e FC.
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

  // valor exibido em "Acordou": manual > sono real > estimativa
  let acordouValor = "—";
  let acordouSub: string | undefined;
  if (acordarManual) {
    acordouValor = acordarManual;
    acordouSub = "ajustado por você";
  } else if (resumo?.acordouEm) {
    acordouValor = hhmm(resumo.acordouEm);
    acordouSub = resumo.sonoMin > 0 ? `${Math.floor(resumo.sonoMin / 60)}h${String(resumo.sonoMin % 60).padStart(2, "0")} de sono` : "do sono";
  } else if (resumo?.acordarEstimado) {
    acordouValor = `~${hhmm(resumo.acordarEstimado)}`;
    acordouSub = rotuloOrigem(resumo.acordarOrigem);
  }

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
        <Tile label="Acordou" valor={acordouValor} sub={acordouSub} />
        <Tile
          label="Treino"
          valor={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoMin} min` : "—"}
          sub={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoSessoes} sessão(ões)` : undefined}
        />
        <Tile label="Passos" valor={resumo && resumo.passos > 0 ? resumo.passos.toLocaleString("pt-BR") : "—"} />
        <Tile label="FC repouso" valor={resumo?.fcRepouso ? `${resumo.fcRepouso} bpm` : "—"} />
      </div>

      {/* ajuste manual do horário de acordar */}
      {editandoHora ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="time"
            value={horaInput}
            onChange={(e) => setHoraInput(e.target.value)}
            className="flex-1 rounded-xl border border-line bg-bg/50 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button onClick={salvarHora} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-bg active:scale-95">
            Salvar
          </button>
          <button onClick={() => setEditandoHora(false)} className="px-2 text-sm text-muted">
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (acordarManual) setHoraInput(acordarManual);
            else if (resumo?.acordarEstimado) setHoraInput(hhmm(resumo.acordarEstimado));
            setEditandoHora(true);
          }}
          className="mt-3 text-xs text-accent underline"
        >
          {acordarManual ? "corrigir horário de acordar" : "ajustar horário de acordar manualmente"}
        </button>
      )}

      {(resumo?.acordouEm || resumo?.acordarEstimado || acordarManual) && (
        <p className="mt-2 text-[11px] text-accent">✓ inegociável de acordar marcado</p>
      )}

      {/* libera permissões que faltam */}
      {resumo && !todasPermissoes(resumo.perms) && (
        <button onClick={autorizar} className="mt-3 w-full rounded-xl border border-line py-2 text-xs font-semibold active:scale-95">
          Autorizar leituras que faltam
        </button>
      )}

      <button onClick={() => setDetalhes((d) => !d)} className="mt-3 text-[11px] text-muted underline">
        {detalhes ? "ocultar diagnóstico" : "ver diagnóstico"}
      </button>
      {detalhes && resumo && (
        <div className="mt-2 space-y-0.5 rounded-xl border border-line bg-bg/40 p-3 text-[11px] text-muted">
          <p>
            Permissões — sono: {resumo.perms.sono ? "✓" : "✗"} · treino: {resumo.perms.treino ? "✓" : "✗"} · passos:{" "}
            {resumo.perms.passos ? "✓" : "✗"} · FC rep: {resumo.perms.fcRepouso ? "✓" : "✗"} · FC intra:{" "}
            {resumo.perms.fcIntra ? "✓" : "✗"}
          </p>
          <p>Despertar por FC: {resumo.fcWake ? hhmm(resumo.fcWake) : "—"}</p>
          <p>Despertar por passos: {resumo.stepsWake ? hhmm(resumo.stepsWake) : "—"}</p>
          <p>Passos hoje: {resumo.passos}</p>
          <p>Sono lido (36h): {resumo.sonoRegistros} · último: {resumo.ultimoSonoFim ? dataHora(resumo.ultimoSonoFim) : "—"}</p>
          {resumo.erro && <p className="text-[#fb7185]">Erro: {resumo.erro}</p>}
        </div>
      )}
    </div>
  );
}
