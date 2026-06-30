"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "@/lib/db";

// Meta de cardio semanal: 90 minutos
const META_CARDIO_SEMANAL = 90;

export function CardioSemanalCard() {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("Corrida");
  const [minutos, setMinutos] = useState(30);
  const [dataInput, setDataInput] = useState(() => new Date().toISOString().split("T")[0]);
  const [outraAtividade, setOutraAtividade] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  // Calcula a segunda-feira desta semana em UTC/local aproximado
  const obterSegundaFeira = () => {
    const d = new Date();
    const day = d.getDay();
    // Ajusta o domingo (0) para ser -6 dias, e os outros para seg (1)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const mondayStr = obterSegundaFeira().toISOString().split("T")[0];

  // Busca os cardios da semana
  const cardiosSemana = useLiveQuery(async () => {
    return db.cardios.where("data").aboveOrEqual(mondayStr).toArray();
  }, [mondayStr]) ?? [];

  const minutosTotais = cardiosSemana.reduce((sum, c) => sum + c.minutos, 0);
  const pct = Math.min(100, Math.round((minutosTotais / META_CARDIO_SEMANAL) * 100));

  async function adicionarCardio() {
    const atividade = tipo === "Outro" ? outraAtividade.trim() || "Cardio" : tipo;
    if (minutos <= 0) return;

    await db.cardios.put({
      id: "manual-" + Math.random().toString(36).substring(2) + Date.now().toString(36),
      tipo: atividade,
      minutos,
      data: dataInput,
      origem: "manual",
    });

    setOutraAtividade("");
    setMostrarForm(false);
  }

  async function removerCardio(id: string) {
    if (confirm("Tem certeza que deseja excluir esta sessão de cardio?")) {
      await db.cardios.delete(id);
    }
  }

  function formatarData(dataStr: string) {
    try {
      const partes = dataStr.split("-");
      const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      const diaSemana = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      return `${partes[2]}/${partes[1]} - ${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)}`;
    } catch {
      return dataStr;
    }
  }

  return (
    <section className="glass rounded-3xl p-5" style={{ boxShadow: "inset 0 0 0 1px var(--accent)" }}>
      {/* Header */}
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between text-left outline-none">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            🏃 Cardio Semanal
          </h2>
          <p className="text-[11px] text-muted">
            Meta: {META_CARDIO_SEMANAL} min/semana · Concluído: {minutosTotais} min ({pct}%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pct >= 100 && <span className="text-xs">🏆</span>}
          <span className="text-lg text-muted">{aberto ? "−" : "+"}</span>
        </div>
      </button>

      {/* Progress Bar (Visible even when collapsed for quick progress feedback) */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-line relative">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-5 space-y-4">
              {/* Sessões Realizadas */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Sessões Desta Semana</p>
                {cardiosSemana.length === 0 ? (
                  <p className="text-[11px] text-muted italic">Nenhuma sessão registrada nesta semana.</p>
                ) : (
                  <div className="space-y-1.5">
                    {cardiosSemana
                      .sort((a, b) => b.data.localeCompare(a.data))
                      .map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl bg-bg/40 border border-line/50 p-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span>{c.origem === "health_connect" ? "⌚" : "👤"}</span>
                            <span className="font-semibold text-fg">{c.tipo}</span>
                            <span className="text-[10px] text-muted font-medium bg-line/45 rounded px-1">{formatarData(c.data)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-accent">{c.minutos} min</span>
                            {c.origem === "manual" && (
                              <button
                                onClick={() => removerCardio(c.id)}
                                className="text-muted hover:text-fg text-sm px-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Botão e Formulário para Novo Cardio */}
              {!mostrarForm ? (
                <button
                  onClick={() => setMostrarForm(true)}
                  className="w-full rounded-xl border border-line py-2 text-xs font-bold text-accent active:scale-95 transition-all"
                >
                  + Adicionar Cardio Manual
                </button>
              ) : (
                <div className="rounded-2xl border border-line/65 bg-bg/50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Registrar Cardio Manual</p>
                  
                  {/* Tipo Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {["Corrida", "Caminhada", "Bicicleta", "Outro"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                          tipo === t
                            ? "bg-accent border-accent text-bg"
                            : "border-line text-muted hover:text-fg"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {tipo === "Outro" && (
                    <input
                      type="text"
                      placeholder="Nome do exercício..."
                      value={outraAtividade}
                      onChange={(e) => setOutraAtividade(e.target.value)}
                      className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                    />
                  )}

                  {/* Minutos e Data */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Minutos</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={minutos || ""}
                        onChange={(e) => setMinutos(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-xl border border-line bg-bg/50 px-3 py-2 text-xs font-semibold text-fg outline-none focus:border-accent text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">Data</label>
                      <input
                        type="date"
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        className="w-full rounded-xl border border-line bg-bg/50 px-3 py-1.5 text-xs font-semibold text-fg outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Confirmar e Cancelar */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={adicionarCardio}
                      className="flex-1 rounded-xl bg-accent py-2 text-xs font-bold text-bg active:scale-95"
                    >
                      Salvar Sessão
                    </button>
                    <button
                      onClick={() => setMostrarForm(false)}
                      className="rounded-xl border border-line px-3 text-xs font-bold text-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
