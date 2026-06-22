"use client";

import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { INEGOCIAVEIS, BLOCOS } from "@/lib/plan-data";
import { nivelDoXp } from "@/lib/xp";
import { diaDoPlano, nomeDiaSemana } from "@/lib/dates";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { ScreenTimeCard } from "@/components/ScreenTimeCard";
import { HealthSyncCard } from "@/components/HealthSyncCard";
import { CoachCard } from "@/components/CoachCard";
import { AvatarHero } from "@/components/AvatarHero";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function HojePage() {
  const { config, diaHoje, ctx, toggleTarefa } = useApp();

  const nivel = nivelDoXp(ctx.xpTotal);
  const diaN = config ? diaDoPlano(config.dataInicio) : 1;
  const feitos = INEGOCIAVEIS.filter((t) => diaHoje.concluidas.includes(t.id)).length;
  const progIneg = feitos / INEGOCIAVEIS.length;

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
            <span className="text-3xl font-extrabold">{feitos}/3</span>
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

      {/* Sincronização Huawei Band via Health Connect */}
      <HealthSyncCard />

      {/* Coach adaptativo — direcionamento do dia */}
      <CoachCard />

      {/* Inegociáveis */}
      <section className="space-y-2.5">
        <SectionTitle titulo="Os 3 inegociáveis" sub="A espinha. Mesmo no pior dia." />
        {INEGOCIAVEIS.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            destaque
            done={diaHoje.concluidas.includes(t.id)}
            onToggle={() => toggleTarefa(t.id)}
          />
        ))}
      </section>

      {/* Blocos */}
      <section className="space-y-2.5">
        <SectionTitle titulo="Blocos do dia" sub="Reforço. Cada um soma." />
        {BLOCOS.map((t) => (
          <TaskItem
            key={t.id}
            task={t}
            done={diaHoje.concluidas.includes(t.id)}
            onToggle={() => toggleTarefa(t.id)}
          />
        ))}
      </section>

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

function SectionTitle({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-sm font-bold uppercase tracking-wider">{titulo}</h2>
      <span className="text-xs text-muted">{sub}</span>
    </div>
  );
}
