"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { chaveSemana, hojeChave } from "@/lib/dates";
import type { RevisaoSemanal } from "@/lib/types";

const semanaAtual = () => chaveSemana();

export default function RevisaoPage() {
  const [r, setR] = useState<RevisaoSemanal>({
    semana: semanaAtual(),
    data: hojeChave(),
    inegociaveisDias: 0,
    treinos: 0,
    diasLeitura: 0,
    janelaRedeOk: false,
    financasOk: false,
    nota: "",
  });
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    db.revisoes.get(semanaAtual()).then((existente) => {
      if (existente) setR(existente);
    });
  }, []);

  async function salvar() {
    await db.revisoes.put({ ...r, semana: semanaAtual(), data: hojeChave() });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Revisão da semana</h1>
        <p className="text-sm text-muted">
          Meça por evidência, não por sentimento. Semana {r.semana}.
        </p>
      </header>

      <div className="space-y-4">
        <Contador
          label="Cumpri os 3 inegociáveis quantos dias?"
          valor={r.inegociaveisDias}
          max={7}
          onChange={(v) => setR({ ...r, inegociaveisDias: v })}
        />
        <Contador
          label="Quantos treinos? (meta: 4)"
          valor={r.treinos}
          max={7}
          onChange={(v) => setR({ ...r, treinos: v })}
        />
        <Contador
          label="Quantos dias li 25 min?"
          valor={r.diasLeitura}
          max={7}
          onChange={(v) => setR({ ...r, diasLeitura: v })}
        />
        <Toggle
          label="Mantive a janela única de rede?"
          valor={r.janelaRedeOk}
          onChange={(v) => setR({ ...r, janelaRedeOk: v })}
        />
        <Toggle
          label="Fiz os 30 min de finanças?"
          valor={r.financasOk}
          onChange={(v) => setR({ ...r, financasOk: v })}
        />

        <div className="glass rounded-2xl p-4">
          <label className="mb-2 block text-sm font-medium">Nota da semana</label>
          <textarea
            value={r.nota}
            onChange={(e) => setR({ ...r, nota: e.target.value })}
            rows={3}
            placeholder="O que funcionou? O que ajustar?"
            className="w-full resize-none rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={salvar}
          className="w-full rounded-2xl bg-accent py-3.5 font-bold text-bg transition-transform active:scale-95"
        >
          {salvo ? "Salvo ✓" : "Salvar revisão"}
        </button>
      </div>
    </div>
  );
}

function Contador({
  label,
  valor,
  max,
  onChange,
}: {
  label: string;
  valor: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
              valor === i ? "bg-accent text-bg" : "border border-line text-muted"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!valor)}
      className="glass flex w-full items-center justify-between rounded-2xl p-4 text-left"
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          valor ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            valor ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
