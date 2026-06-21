"use client";

import { useEffect, useState } from "react";
import {
  tempoTelaDisponivel,
  temPermissaoTempoTela,
  pedirPermissaoTempoTela,
  usoSocialHoje,
  type UsoSocial,
} from "@/lib/screen-time";
import { LIMITE_REDE_MIN } from "@/lib/social-apps";

type Estado = "carregando" | "web" | "sem-permissao" | "ok";

export function ScreenTimeCard() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [uso, setUso] = useState<UsoSocial | null>(null);

  async function atualizar() {
    if (!tempoTelaDisponivel()) {
      setEstado("web");
      return;
    }
    const ok = await temPermissaoTempoTela();
    if (!ok) {
      setEstado("sem-permissao");
      return;
    }
    try {
      setUso(await usoSocialHoje());
      setEstado("ok");
    } catch {
      setEstado("sem-permissao");
    }
  }

  useEffect(() => {
    atualizar();
  }, []);

  async function conceder() {
    await pedirPermissaoTempoTela();
    // ao voltar dos Ajustes, o usuário toca em "atualizar"
  }

  if (estado === "web") {
    return (
      <div className="rounded-2xl border border-line bg-card/50 p-4">
        <p className="text-sm font-semibold">📵 Tempo de tela</p>
        <p className="mt-0.5 text-xs text-muted">
          Monitoramento automático de Instagram/WhatsApp disponível no app Android.
        </p>
      </div>
    );
  }

  if (estado === "carregando") {
    return <div className="h-20 animate-pulse rounded-2xl bg-card/50" />;
  }

  if (estado === "sem-permissao") {
    return (
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">📵 Tempo de tela</p>
        <p className="mt-0.5 text-xs text-muted">
          Conceda “Acesso ao uso” pra eu acompanhar sua janela de rede automaticamente.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={conceder}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-bg active:scale-95"
          >
            Conceder acesso
          </button>
          <button
            onClick={atualizar}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold active:scale-95"
          >
            Atualizar
          </button>
        </div>
      </div>
    );
  }

  // estado ok
  const total = uso?.totalMin ?? 0;
  const dentro = total <= LIMITE_REDE_MIN;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">📵 Rede social hoje</p>
        <button onClick={atualizar} className="text-xs text-muted">
          atualizar
        </button>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span
          className={`text-3xl font-extrabold ${dentro ? "text-gradient" : ""}`}
          style={dentro ? undefined : { color: "#fb7185" }}
        >
          {total}
        </span>
        <span className="mb-1 text-sm text-muted">/ {LIMITE_REDE_MIN} min</span>
        <span className="mb-1 ml-auto text-xs font-semibold">
          {dentro ? "dentro da janela ✓" : "passou do limite"}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (total / LIMITE_REDE_MIN) * 100)}%`,
            background: dentro ? "var(--accent)" : "#fb7185",
          }}
        />
      </div>

      {uso && uso.apps.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {uso.apps.map((a) => (
            <li key={a.pkg} className="flex items-center gap-2 text-sm">
              <span>{a.icone}</span>
              <span className="flex-1">{a.nome}</span>
              <span className="text-muted">{a.minutos} min</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
