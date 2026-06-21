"use client";

import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { CONQUISTAS, TEMAS } from "@/lib/plan-data";

export default function ConquistasPage() {
  const { conquistasIds, ctx, config, setTema } = useApp();

  const total = CONQUISTAS.length;
  const desbloqueadas = conquistasIds.length;

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Troféus</h1>
        <p className="text-sm text-muted">
          {desbloqueadas} de {total} conquistas desbloqueadas
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {CONQUISTAS.map((c, i) => {
          const ok = conquistasIds.includes(c.id);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 ${
                ok
                  ? "glass glow-accent border-transparent"
                  : "border-line bg-card/40"
              }`}
            >
              <div
                className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                  ok ? "bg-accent-soft" : "bg-bg/40 grayscale"
                }`}
                style={ok ? undefined : { opacity: 0.4 }}
              >
                {ok ? c.icone : "🔒"}
              </div>
              <p className={`text-sm font-bold ${ok ? "" : "text-muted"}`}>{c.titulo}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted">{c.descricao}</p>
            </motion.div>
          );
        })}
      </section>

      {/* Galeria de temas */}
      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wider">
          Temas desbloqueáveis
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {TEMAS.map((t) => {
            const ok = ctx.xpTotal >= t.xpDesbloqueio;
            const ativo = config?.temaAtivo === t.id;
            return (
              <button
                key={t.id}
                disabled={!ok}
                onClick={() => ok && setTema(t.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  ativo ? "border-transparent ring-2" : "border-line"
                } ${ok ? "" : "opacity-50"}`}
                style={ativo ? { boxShadow: `0 0 0 2px ${t.accent}` } : undefined}
              >
                <span
                  className="h-9 w-9 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.nome}</span>
                  <span className="block text-[11px] text-muted">
                    {ok ? (ativo ? "ativo" : "tocar p/ ativar") : `${t.xpDesbloqueio} XP`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
