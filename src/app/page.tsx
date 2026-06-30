"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { nivelDoXp } from "@/lib/xp";
import { diaDoPlano, nomeDiaSemana } from "@/lib/dates";
import { ProgressRing } from "@/components/ProgressRing";
import { ScreenTimeCard } from "@/components/ScreenTimeCard";
import { HealthSyncCard } from "@/components/HealthSyncCard";
import { CoachCard } from "@/components/CoachCard";
import { AvatarHero } from "@/components/AvatarHero";
import { RevisaoLeituraCard } from "@/components/RevisaoLeituraCard";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HojePage() {
  const { config, diaHoje, ctx, tarefas } = useApp();

  const inegociaveis = tarefas.filter((t) => t.category === "inegociavel");

  const nivel = nivelDoXp(ctx.xpTotal);
  const diaN = config ? diaDoPlano(config.dataInicio) : 1;
  const feitos = inegociaveis.filter((t) => diaHoje.concluidas.includes(t.id)).length;
  const progIneg = inegociaveis.length > 0 ? feitos / inegociaveis.length : 0;
  const totalFeitos = tarefas.filter((t) => diaHoje.concluidas.includes(t.id)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pt-1">
        <p className="text-sm text-muted">
          {saudacao()}, Alan · {nomeDiaSemana()}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
          Dia <span className="text-gradient">{diaN > 0 ? diaN : 0}</span> de 90
        </h1>
      </header>

      {/* Avatar (Solo Leveling) — centro da tela inicial */}
      <AvatarHero />

      {/* Card de status: nível + XP do dia + streak */}
      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="flex items-center gap-5">
          <ProgressRing progress={progIneg} size={120}>
            <span className="text-3xl font-extrabold">{feitos}/{inegociaveis.length}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted">
              inegociáveis
            </span>
          </ProgressRing>

          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted">Nível {nivel.nivel}</p>
              <p className="text-lg font-bold leading-tight">{nivel.nome}</p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${nivel.progresso * 100}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {nivel.xpNivelAtual}/{nivel.xpProximoNivel} XP
              </p>
            </div>

            <div className="flex gap-2">
              <Stat valor={`${ctx.streakAtual}🔥`} label="streak" />
              <Stat valor={`${ctx.xpTotal}`} label="XP total" />
            </div>
          </div>
        </div>
      </section>

      {/* Coach adaptativo — direcionamento do dia (em destaque, logo no topo) */}
      <CoachCard />

      {/* Coach de IA — mentor conversacional (corpo, mente, hábitos) */}
      <Link
        href="/coach/"
        className="glass flex items-center gap-4 rounded-2xl p-4 transition-transform active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl">🧭</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Falar com o Coach IA</p>
          <p className="text-xs text-muted">Mentor fundamentado que lê seus dados e te orienta</p>
        </div>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      {/* Resumo do dia → leva para a Agenda (onde fica o tick das tarefas) */}
      <Link
        href="/agenda/"
        className="glass flex items-center gap-4 rounded-3xl p-5 transition-transform active:scale-[0.98]"
      >
        <ProgressRing progress={progIneg} size={64}>
          <span className="text-sm font-extrabold">{feitos}/{inegociaveis.length}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Agenda do dia</p>
          <p className="text-xs text-muted">
            {feitos === inegociaveis.length && inegociaveis.length > 0
              ? "Inegociáveis fechados. Segue o ritmo."
              : `${totalFeitos} de ${tarefas.length} tarefas feitas hoje`}
          </p>
        </div>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      {/* Cartão de Foco / Biblioteca */}
      <RevisaoLeituraCard />

      {/* Sincronização Huawei Band via Health Connect */}
      <HealthSyncCard />

      {/* Tempo de tela (automático no Android) */}
      <ScreenTimeCard />
    </div>
  );
}

function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-bg/40 px-3 py-2 text-center">
      <p className="text-base font-bold">{valor}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
