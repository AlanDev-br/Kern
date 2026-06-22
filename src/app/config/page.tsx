"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { getTask } from "@/lib/plan-data";
import { pedirPermissaoNotificacoes, reagendarNotificacoes, ehNativo, agendarTeste, contarAgendadas } from "@/lib/notifications";
import { exportarBackup, importarBackup } from "@/lib/backup";
import { APPS_SOCIAIS } from "@/lib/social-apps";
import {
  tempoTelaDisponivel,
  obterEstadoLimitador,
  definirLimitesConfig,
  pedirPermissaoSobreposicao,
  temPermissaoTempoTela,
  pedirPermissaoTempoTela,
} from "@/lib/screen-time";

const CAMPOS_HORARIO: { chave: string; label: string }[] = [
  { chave: "ineg-acordar", label: "Acordar" },
  { chave: "ineg-treino", label: "Treino" },
  { chave: "bloco-carreira", label: "Carreira" },
  { chave: "ineg-leitura", label: "Leitura" },
  { chave: "bloco-telasoff", label: "Telas off" },
  { chave: "financas", label: "Finanças (sáb)" },
  { chave: "revisao", label: "Revisão (dom)" },
];

export default function ConfigPage() {
  const { config, atualizarConfig } = useApp();
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [limiterEnabled, setLimiterEnabled] = useState(false);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [hasOverlay, setHasOverlay] = useState(false);
  const [hasUsageStats, setHasUsageStats] = useState(false);
  const [nativoDisponivel, setNativoDisponivel] = useState(false);
  const [carregandoLimites, setCarregandoLimites] = useState(true);

  useEffect(() => {
    async function carregarLimiter() {
      if (tempoTelaDisponivel()) {
        setNativoDisponivel(true);
        const state = await obterEstadoLimitador();
        setLimiterEnabled(state.enabled);
        setLimits(state.limits || {});
        setHasOverlay(state.hasOverlayPermission);
        
        const usageOk = await temPermissaoTempoTela();
        setHasUsageStats(usageOk);
      }
      setCarregandoLimites(false);
    }
    carregarLimiter();
  }, []);

  useEffect(() => {
    async function revalidaPermissoes() {
      if (document.visibilityState === "visible" && tempoTelaDisponivel()) {
        const state = await obterEstadoLimitador();
        setHasOverlay(state.hasOverlayPermission);
        const usageOk = await temPermissaoTempoTela();
        setHasUsageStats(usageOk);
      }
    }
    document.addEventListener("visibilitychange", revalidaPermissoes);
    return () => document.removeEventListener("visibilitychange", revalidaPermissoes);
  }, []);

  async function toggleLimiter() {
    const nextVal = !limiterEnabled;
    setLimiterEnabled(nextVal);
    await definirLimitesConfig(limits, nextVal);
    setMsg(nextVal ? "Limitador de foco ativado." : "Limitador de foco desativado.");
  }

  async function atualizarLimiteApp(pkg: string, min: number) {
    const novosLimites = { ...limits, [pkg]: min };
    setLimits(novosLimites);
    await definirLimitesConfig(novosLimites, limiterEnabled);
  }

  async function solicitarSobreposicao() {
    await pedirPermissaoSobreposicao();
    setTimeout(async () => {
      const state = await obterEstadoLimitador();
      setHasOverlay(state.hasOverlayPermission);
    }, 1500);
  }

  async function solicitarAcessoUso() {
    await pedirPermissaoTempoTela();
    setTimeout(async () => {
      const ok = await temPermissaoTempoTela();
      setHasUsageStats(ok);
    }, 1500);
  }

  if (!config) return null;

  async function setHorario(chave: string, valor: string) {
    const horarios = { ...config!.horarios, [chave]: valor };
    await atualizarConfig({ horarios });
    await reagendarNotificacoes({ ...config!, horarios });
  }

  async function toggleNotif() {
    const ativas = !config!.notificacoesAtivas;
    if (ativas) {
      const ok = await pedirPermissaoNotificacoes();
      if (!ok) {
        setMsg("Permissão de notificação negada.");
        return;
      }
    }
    await atualizarConfig({ notificacoesAtivas: ativas });
    await reagendarNotificacoes({ ...config!, notificacoesAtivas: ativas });
    setMsg(ativas ? "Notificações ativadas e agendadas." : "Notificações desativadas.");
  }

  async function exportar() {
    try {
      await exportarBackup();
      setMsg("Backup exportado.");
    } catch {
      setMsg("Erro ao exportar.");
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      await importarBackup(txt);
      setMsg("Backup importado. Recarregando...");
      setTimeout(() => location.reload(), 800);
    } catch {
      setMsg("Arquivo de backup inválido.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted">Personalize o seu plano.</p>
      </header>

      {msg && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-3 text-sm">
          {msg}
        </div>
      )}

      {/* Data de início */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Início dos 90 dias</h2>
        <input
          type="date"
          value={config.dataInicio}
          onChange={(e) => atualizarConfig({ dataInicio: e.target.value })}
          className="w-full rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
        />
      </section>

      {/* Notificações */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider">Notificações</h2>
            <p className="text-xs text-muted">
              {ehNativo() ? "Lembretes nativos no horário" : "Disponível no app Android"}
            </p>
          </div>
          <button
            onClick={toggleNotif}
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
              config.notificacoesAtivas ? "bg-accent" : "bg-line"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition-transform ${
                config.notificacoesAtivas ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {CAMPOS_HORARIO.map((c) => (
            <div key={c.chave} className="flex items-center justify-between">
              <span className="text-sm">
                {getTask(c.chave)?.icone ?? "⏰"} {c.label}
              </span>
              <input
                type="time"
                value={config.horarios[c.chave] ?? ""}
                onChange={(e) => setHorario(c.chave, e.target.value)}
                className="rounded-lg border border-line bg-bg/50 px-2 py-1 text-sm outline-none focus:border-accent"
              />
            </div>
          ))}
        </div>

        {ehNativo() && (
          <button
            onClick={async () => {
              const ok = await agendarTeste();
              const n = await contarAgendadas();
              setMsg(
                ok
                  ? `Teste enviado! Deve chegar em ~8s. ${n} lembretes agendados.`
                  : "Permissão de notificação negada — libere nos Ajustes do Android.",
              );
            }}
            className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-bold active:scale-95"
          >
            Testar notificação (8s)
          </button>
        )}
      </section>

      {/* Backup */}
      <section className="glass rounded-3xl p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider">Backup</h2>
        <p className="mb-3 text-xs text-muted">
          Seus dados ficam só no aparelho. Exporte de vez em quando para o Drive/WhatsApp.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportar}
            className="rounded-xl bg-accent py-3 text-sm font-bold text-bg transition-transform active:scale-95"
          >
            Exportar
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-line py-3 text-sm font-bold transition-transform active:scale-95"
          >
            Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={onImport}
          className="hidden"
        />
        {config.ultimoBackup && (
          <p className="mt-2 text-[11px] text-muted">Último backup: {config.ultimoBackup}</p>
        )}
      </section>

      {/* Limitador de Aplicativos (Foco) */}
      {nativoDisponivel && (
        <section className="glass rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">Limites de Aplicativos</h2>
              <p className="text-xs text-muted">Estilo StayFree — bloqueia redes sociais se passar do limite</p>
            </div>
            <button
              onClick={toggleLimiter}
              className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
                limiterEnabled ? "bg-accent" : "bg-line"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white transition-transform ${
                  limiterEnabled ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {limiterEnabled && (
            <div className="space-y-4 pt-2 border-t border-line/50">
              {/* Avisos de Permissões */}
              {(!hasUsageStats || !hasOverlay) && (
                <div className="rounded-2xl bg-accent-soft border border-accent/20 p-3 space-y-2">
                  <p className="text-xs font-bold text-accent">⚠️ Permissões Necessárias:</p>
                  
                  {!hasUsageStats && (
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Acesso aos dados de uso</span>
                      <button onClick={solicitarAcessoUso} className="text-accent underline font-semibold">
                        autorizar
                      </button>
                    </div>
                  )}
                  
                  {!hasOverlay && (
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Sobrepor a outros apps (bloqueio)</span>
                      <button onClick={solicitarSobreposicao} className="text-accent underline font-semibold">
                        autorizar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Lista de apps monitorados */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted uppercase">Limites Diários por App:</p>
                {APPS_SOCIAIS.map((app) => {
                  const valor = limits[app.pkg] || 0;
                  return (
                    <div key={app.pkg} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{app.icone}</span>
                        <span className="font-medium">{app.nome}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="480"
                          value={valor || ""}
                          placeholder="off"
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            atualizarLimiteApp(app.pkg, val);
                          }}
                          className="w-16 rounded-lg border border-line bg-bg/50 px-2 py-1 text-right text-sm outline-none focus:border-accent"
                        />
                        <span className="text-xs text-muted">min</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted italic">Digite 0 ou deixe em branco para desativar o limite de um aplicativo específico.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
