"use client";

import { useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { getTask } from "@/lib/plan-data";
import { pedirPermissaoNotificacoes, reagendarNotificacoes, ehNativo } from "@/lib/notifications";
import { exportarBackup, importarBackup } from "@/lib/backup";

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
    </div>
  );
}
