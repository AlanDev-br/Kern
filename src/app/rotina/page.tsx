"use client";

import Link from "next/link";

const ROTINA = [
  { h: "06:30", t: "Acordar (horário fixo)", p: "Âncora de tudo." },
  { h: "06:30–07:15", t: "Sem celular · água · luz · despejo mental", p: "Quebra o vício de validação cedo." },
  { h: "07:15–08:00", t: "Treino ou cardio", p: "Maior redutor de ansiedade." },
  { h: "08:30–11:00", t: "Bloco de pico — Carreira", p: "EstoqueZap + candidaturas + código." },
  { h: "11:00–12:30", t: "Faculdade (EAD)", p: "Bloco fixo." },
  { h: "Tarde", t: "Almoço + descanso + bloco flexível", p: "Descanso entra no plano." },
  { h: "Janela única", t: "Redes sociais 30–40 min", p: "Nunca a 1ª nem a última coisa do dia." },
  { h: "Noite", t: "Música / projeto criativo", p: "Criatividade tem hora." },
  { h: "21:30", t: "Leitura 25 min", p: "Troca direta: livro pela tela." },
  { h: "22:00", t: "Telas off", p: "Sono começa antes de deitar." },
  { h: "~23:00", t: "Dormir", p: "~7h30 de sono." },
];

const SEMANA = [
  "Treino: 4x/semana (3 força + 1 cardio)",
  "Carreira/EstoqueZap: 5x/semana (~2h30 manhã)",
  "Faculdade: bloco fixo separado do trabalho profundo",
  "Música: 2–3 noites ou fim de semana",
  "Finanças: 1x/semana, 30 min (sábado)",
  "Domingo: descanso + planejar a semana (15 min)",
];

export default function RotinaPage() {
  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Rotina</h1>
        <p className="text-sm text-muted">O mapa do dia e da semana.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/revisao/"
          className="glass rounded-2xl p-4 transition-transform active:scale-95"
        >
          <p className="text-2xl">📊</p>
          <p className="mt-1 text-sm font-bold">Revisão semanal</p>
          <p className="text-xs text-muted">Domingo, 15 min</p>
        </Link>
        <Link
          href="/financas/"
          className="glass rounded-2xl p-4 transition-transform active:scale-95"
        >
          <p className="text-2xl">💸</p>
          <p className="mt-1 text-sm font-bold">Finanças</p>
          <p className="text-xs text-muted">Sábado, 30 min</p>
        </Link>
      </div>

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Dia (template)</h2>
        <ol className="space-y-3">
          {ROTINA.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-24 shrink-0 text-xs font-semibold text-accent">{r.h}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{r.t}</span>
                <span className="block text-xs text-muted">{r.p}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider">Agenda semanal</h2>
        <ul className="space-y-2">
          {SEMANA.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-accent">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
