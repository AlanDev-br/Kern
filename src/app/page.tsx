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
import { ParecerCard } from "@/components/ParecerCard";
import { AvatarHero } from "@/components/AvatarHero";
import { RevisaoLeituraCard } from "@/components/RevisaoLeituraCard";
import { Icone } from "@/components/Icone";

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
          {/* Sem nome definido a saudação é só a saudação. Chamar todo mundo
              pelo nome de uma pessoa é pior que não chamar por nome nenhum. */}
          {config?.nome?.trim() ? `${saudacao()}, ${config.nome.trim()}` : saudacao()} ·{" "}
          {nomeDiaSemana()}
        </p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight">
          Dia <span className="text-acento">{diaN > 0 ? diaN : 0}</span> de 90
        </h1>
      </header>

      {/* A leitura da IA sobre ontem. Some sozinha quando não há o que dizer. */}
      <ParecerCard />

      {/* Avatar (Solo Leveling) — centro da tela inicial */}
      <AvatarHero />

      {/* Card de status: nível + XP do dia + streak */}
      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="flex items-center gap-5">
          <ProgressRing progress={progIneg} size={120}>
            <span className="text-3xl font-extrabold">{feitos}/{inegociaveis.length}</span>
            <span className="text-xs uppercase tracking-widest text-muted">
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
              <p className="mt-1 text-xs text-muted">
                {nivel.xpNivelAtual}/{nivel.xpProximoNivel} XP
              </p>
            </div>

            <div className="flex gap-2">
              <Stat valor={`${ctx.streakAtual}`} label="streak" />
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icone nome="coach" tamanho={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Falar com o Coach IA</p>
          <p className="text-xs text-muted">Lê seus dados e responde sobre treino, sono e hábito</p>
        </div>
        <Icone nome="chevron" tamanho={18} className="shrink-0 text-muted" />
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
        <Icone nome="chevron" tamanho={18} className="shrink-0 text-muted" />
      </Link>

      {/* Cartão de Foco / Biblioteca */}
      <RevisaoLeituraCard />

      {/* Dados do vestível, via Health Connect */}
      <HealthSyncCard />

      {/* Tempo de tela (automático no Android) */}
      <ScreenTimeCard />
    </div>
  );
}

// Sem caixa-alta: "XP total" cabe numa linha, "XP TOTAL" com tracking não cabe
// e quebra em duas dentro de uma placa de 90px. Caixa-alta com espaçamento é
// decoração que custa largura, e aqui a largura é o que falta.
function Stat({ valor, label }: { valor: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-line bg-bg/40 px-3 py-2 text-center">
      <p className="text-base font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
