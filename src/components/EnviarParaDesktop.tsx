"use client";

import { useState } from "react";
import { enviarParaDesktop, enderecoLembrado, type ResultadoEnvio } from "@/lib/enviar-desktop";
import { Icone } from "./Icone";

// O gesto do celular: mandar o dia para o computador.
//
// Não aparece dentro do executável — lá o cartão é o de receber. Um app não
// manda para si mesmo.

function dentroDoDesktop(): boolean {
  return !!(window as unknown as { kernDesktop?: { presente?: boolean } }).kernDesktop?.presente;
}

export function EnviarParaDesktop() {
  const [endereco, setEndereco] = useState(() => enderecoLembrado());
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "pronto" | "erro">("parado");
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  const [erro, setErro] = useState("");

  if (typeof window !== "undefined" && dentroDoDesktop()) return null;

  const podeEnviar = endereco.trim().length >= 7 && codigo.trim().length === 6 && estado !== "enviando";

  async function enviar() {
    setEstado("enviando");
    setErro("");
    try {
      const r = await enviarParaDesktop(endereco, codigo);
      setResultado(r);
      setEstado("pronto");
    } catch (e) {
      setErro((e as Error)?.message ?? "Não consegui enviar.");
      setEstado("erro");
    }
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-accent">
        <Icone nome="enviar" tamanho={18} />
        <h2 className="text-base font-bold tracking-tight">Enviar para o computador</h2>
      </div>

      <p className="mt-2 text-sm text-muted">
        Abra o Kern no computador e copie o endereço e o código que aparecem lá. Os dois
        precisam estar no mesmo Wi-Fi.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">Endereço do computador</span>
          <input
            type="text"
            inputMode="decimal"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="192.168.0.10"
            className="mt-1 w-full rounded-xl border border-line bg-bg/50 p-3 text-sm font-semibold tabular-nums outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted">Código de 6 dígitos</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-1 w-full rounded-xl border border-line bg-bg/50 p-3 text-sm font-semibold tracking-[0.3em] tabular-nums outline-none focus:border-accent"
          />
        </label>

        <button
          onClick={enviar}
          disabled={!podeEnviar}
          className="alvo w-full rounded-xl bg-accent px-4 text-sm font-bold text-bg transition-transform active:scale-95 disabled:opacity-40"
        >
          {estado === "enviando" ? "Enviando…" : "Enviar agora"}
        </button>
      </div>

      {estado === "pronto" && resultado && (
        <p className="mt-3 text-sm text-fg/90">
          Enviado para {resultado.maquina}: {resultado.registros.toLocaleString("pt-BR")} registros,{" "}
          {(resultado.bytes / 1024 / 1024).toFixed(1)} MB.
        </p>
      )}
      {estado === "erro" && <p className="mt-3 text-sm text-rose-400">{erro}</p>}

      <p className="mt-3 text-xs leading-relaxed text-muted">
        O computador passa a ficar igual ao celular. O caminho é só de ida: o que você fizer
        no computador não volta para cá.
      </p>
    </section>
  );
}
