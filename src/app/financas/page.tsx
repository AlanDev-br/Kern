"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import type { Divida } from "@/lib/types";

export default function FinancasPage() {
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [form, setForm] = useState({ nome: "", valor: "", juros: "", vencimento: "" });

  async function recarregar() {
    setDividas(await db.dividas.orderBy("id").toArray());
  }
  useEffect(() => {
    recarregar();
  }, []);

  async function adicionar() {
    if (!form.nome || !form.valor) return;
    await db.dividas.put({
      id: crypto.randomUUID(),
      nome: form.nome,
      valor: parseFloat(form.valor) || 0,
      juros: parseFloat(form.juros) || 0,
      vencimento: form.vencimento,
    });
    setForm({ nome: "", valor: "", juros: "", vencimento: "" });
    recarregar();
  }

  async function remover(id: string) {
    await db.dividas.delete(id);
    recarregar();
  }

  // ordena por juros desc (prioridade do plano)
  const ordenadas = [...dividas].sort((a, b) => b.juros - a.juros);
  const total = dividas.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Finanças</h1>
        <p className="text-sm text-muted">
          Dívida mapeada = problema administrável num horário só.
        </p>
      </header>

      <div className="glass rounded-3xl p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-muted">Total mapeado</p>
        <p className="text-3xl font-extrabold text-gradient">
          R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="mt-1 text-xs text-muted">Priorize a de maior juros primeiro.</p>
      </div>

      {/* form */}
      <div className="glass space-y-3 rounded-3xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Adicionar dívida</h2>
        <input
          placeholder="Nome (ex: cartão)"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className="w-full rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="Valor R$"
            inputMode="decimal"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            className="rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="Juros %"
            inputMode="decimal"
            value={form.juros}
            onChange={(e) => setForm({ ...form, juros: e.target.value })}
            className="rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="Venc."
            value={form.vencimento}
            onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            className="rounded-xl border border-line bg-bg/50 p-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={adicionar}
          className="w-full rounded-xl bg-accent py-3 font-bold text-bg transition-transform active:scale-95"
        >
          Adicionar
        </button>
      </div>

      <div className="space-y-2.5">
        {ordenadas.map((d, i) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{d.nome}</p>
              <p className="text-xs text-muted">
                {d.juros}% a.m. {d.vencimento && `· vence ${d.vencimento}`}
              </p>
            </div>
            <p className="text-sm font-bold">
              R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <button onClick={() => remover(d.id)} className="text-muted">
              ✕
            </button>
          </div>
        ))}
        {ordenadas.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            Mapeie tudo: cada dívida com valor, juros e vencimento.
          </p>
        )}
      </div>
    </div>
  );
}
