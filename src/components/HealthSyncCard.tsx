"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import {
  saudeNativa,
  statusSaude,
  pedirPermissoesSaude,
  lerSaudeHoje,
  todasPermissoes,
  sincronizarCardioRecente,
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
  const setDormirManual = useApp((s) => s.setDormirManual);
  const acordarManual = useApp((s) => s.diaHoje.acordarManual);
  const dormirManual = useApp((s) => s.diaHoje.dormirManual);

  const [status, setStatus] = useState<StatusSaude>("indisponivel");
  const [resumo, setResumo] = useState<ResumoSaude | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [editandoSono, setEditandoSono] = useState(false);
  const [dormirInput, setDormirInput] = useState("23:00");
  const [acordarInput, setAcordarInput] = useState("06:30");

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const st = await statusSaude();
      setStatus(st);
      if (st === "ok") {
        const r = await lerSaudeHoje();
        setResumo(r);
        await sincronizarCardioRecente();
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

  function abrirEditorSono() {
    if (dormirManual) setDormirInput(dormirManual);
    else if (resumo?.dormiuEstimado) setDormirInput(hhmm(resumo.dormiuEstimado));
    if (acordarManual) setAcordarInput(acordarManual);
    else if (resumo?.acordarEstimado) setAcordarInput(hhmm(resumo.acordarEstimado));
    setEditandoSono(true);
  }

  async function salvarSono() {
    if (dormirInput) await setDormirManual(dormirInput);
    if (acordarInput) await setAcordarManual(acordarInput);
    setEditandoSono(false);
  }

  if (!saudeNativa()) {
    return (
      <div className="rounded-2xl border border-line bg-card/50 p-4">
        <p className="text-sm font-semibold">⌚ Huawei Band</p>
        <p className="mt-0.5 text-xs text-muted">
          Importação de sono (dormir/acordar), treino, passos e FC disponível no app Android.
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
          Autorize a leitura no Health Connect pra eu estimar dormir/acordar e acompanhar treino, passos e FC.
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

  // Dormiu: manual > estimativa
  let dormiuValor = "—";
  let dormiuSub: string | undefined;
  if (dormirManual) {
    dormiuValor = dormirManual;
    dormiuSub = "ajustado por você";
  } else if (resumo?.dormiuEstimado) {
    dormiuValor = `~${hhmm(resumo.dormiuEstimado)}`;
    dormiuSub = "estimado por FC";
  }

  // Acordou: manual > sono real > estimativa
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
        <Tile label="Dormiu" valor={dormiuValor} sub={dormiuSub} />
        <Tile label="Acordou" valor={acordouValor} sub={acordouSub} />
        <Tile
          label="Treino"
          valor={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoMin} min` : "—"}
          sub={resumo && resumo.treinoSessoes > 0 ? `${resumo.treinoSessoes} sessão(ões)` : undefined}
        />
        <Tile label="Passos" valor={resumo && resumo.passos > 0 ? resumo.passos.toLocaleString("pt-BR") : "—"} />
        <Tile
          label="FC repouso"
          valor={resumo?.fcRepouso ? `${resumo.fcRepouso} bpm` : "—"}
          sub={
            resumo?.fcRepousoReaproveitada
              ? "último valor"
              : resumo && !resumo.fcRepouso && (resumo.fcRepousoRegistros ?? 0) === 0 && (resumo.fcIntraHoras ?? 0) === 0
                ? "Health Connect sem FC"
                : undefined
          }
        />
      </div>

      {/* ajuste manual dos horários de sono */}
      {editandoSono ? (
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-bg/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Dormi às</span>
            <input
              type="time"
              value={dormirInput}
              onChange={(e) => setDormirInput(e.target.value)}
              className="rounded-lg border border-line bg-bg/50 px-2 py-1 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Acordei às</span>
            <input
              type="time"
              value={acordarInput}
              onChange={(e) => setAcordarInput(e.target.value)}
              className="rounded-lg border border-line bg-bg/50 px-2 py-1 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={salvarSono} className="flex-1 rounded-xl bg-accent py-2 text-sm font-bold text-bg active:scale-95">
              Salvar
            </button>
            <button onClick={() => setEditandoSono(false)} className="px-3 text-sm text-muted">
              cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={abrirEditorSono} className="mt-3 text-xs text-accent underline">
          ajustar horários de sono manualmente
        </button>
      )}

      {(resumo?.acordouEm || resumo?.acordarEstimado || acordarManual) && (
        <p className="mt-2 text-[11px] text-accent">✓ inegociável de acordar marcado</p>
      )}

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
          <p>Dormiu (FC): {resumo.dormiuEstimado ? hhmm(resumo.dormiuEstimado) : "—"}</p>
          <p>Despertar por FC: {resumo.fcWake ? hhmm(resumo.fcWake) : "—"} · por passos: {resumo.stepsWake ? hhmm(resumo.stepsWake) : "—"}</p>
          <p>Passos hoje: {resumo.passos}</p>
          <p>
            FC: RestingHR {resumo.fcRepousoRegistros ?? 0} reg · HR 24h{" "}
            {resumo.fcIntraHoras ?? 0}h → repouso {resumo.fcRepouso ?? "—"}
          </p>
          <p>Sono lido (36h): {resumo.sonoRegistros} · último: {resumo.ultimoSonoFim ? dataHora(resumo.ultimoSonoFim) : "—"}</p>
          {resumo.erro && <p className="text-[#fb7185]">Erro: {resumo.erro}</p>}
        </div>
      )}
    </div>
  );
}
