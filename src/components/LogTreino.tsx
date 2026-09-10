"use client";

import { Icone } from "./Icone";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Rotina, type Treino, type TreinoRascunho } from "@/lib/db";
import { grupoDoExercicio } from "@/lib/musculacao";
import { ExercicioImagem } from "@/components/ExercicioImagem";
import { ExercicioDetalhesModal } from "@/components/ExercicioDetalhesModal";
import { CardPosTreino } from "@/components/CardPosTreino";
import { SeletorExercicio } from "@/components/SeletorExercicio";

interface SetLocal {
  peso: number;
  reps: number;
  tipo?: string;
  feito?: boolean;
  rir?: number;
}
interface ExLocal {
  nome: string;
  sets: SetLocal[];
  observacoes?: string;
}

// Descanso padrão entre séries (segundos). Ajustável na hora pelo cronômetro.
const DESCANSO_PADRAO = 90;

// Aviso ao terminar o descanso: dois bipes curtos (Web Audio, sem asset) e
// vibração. Tocado via setTimeout no fim do descanso.
function avisoFimDescanso() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const bip = (t: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.start(t);
      o.stop(t + 0.2);
    };
    bip(ctx.currentTime);
    bip(ctx.currentTime + 0.28);
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* áudio indisponível */
  }
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* sem vibração */
  }
}

function mmss(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(seg)}` : `${p(m)}:${p(seg)}`;
}

export function LogTreino({
  rotina,
  rascunho,
  catalogo,
  recordes,
  anteriores,
  onFechar,
}: {
  rotina?: Rotina | null;
  rascunho?: TreinoRascunho | null; // treino em andamento a retomar
  catalogo: string[];
  recordes: Record<string, number>; // exercício -> maior carga já feita
  anteriores: Record<string, { peso: number; reps: number }[]>; // última sessão por exercício
  onFechar: () => void;
}) {
  const treinos = useLiveQuery(() => db.treinos.toArray(), []) ?? [];
  const exConfigs = useLiveQuery(() => db.exercicioConfigs.toArray(), []) ?? [];
  const [exercicioDetalhado, setExercicioDetalhado] = useState<string | null>(null);
  // Treino salvo → mostra o card de pós-treino (com snapshot dos recordes anteriores).
  const [concluido, setConcluido] = useState<{ treino: Treino; recordes: Record<string, number> } | null>(null);
  // Seletor de exercício (adicionar / substituir) e confirmação de descarte.
  const [seletor, setSeletor] = useState<{ modo: "add" | "sub"; index?: number } | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  // Mapeia configurações de exercícios salvos
  const exConfigsMap = useMemo(() => {
    const m: Record<string, { descansoAlvo?: number; observacaoGeral?: string }> = {};
    for (const c of exConfigs) {
      m[c.nome] = c;
    }
    return m;
  }, [exConfigs]);

  // Ao retomar um rascunho, preserva o horário de início (cronômetro contínuo).
  const [inicio] = useState(() => (rascunho ? new Date(rascunho.inicio) : new Date()));
  const [agora, setAgora] = useState(() => Date.now());
  const [titulo, setTitulo] = useState(rascunho?.titulo ?? rotina?.nome ?? "Treino");
  const [exercicios, setExercicios] = useState<ExLocal[]>(() => {
    if (rascunho)
      return rascunho.exercicios.map((e) => ({
        nome: e.nome,
        sets: e.sets.map((s) => ({ ...s })),
        observacoes: e.observacoes ?? "",
      }));
    if (rotina)
      return rotina.exercicios.map((e) => ({
        nome: e.nome,
        // A repetição-alvo da rotina entra pré-preenchida para a primeira sessão
        // não começar em branco. Da segunda em diante o app herda o que ela de
        // fato fez, que vale mais que a prescrição.
        sets: Array.from({ length: Math.max(1, e.series) }, () => ({ peso: 0, reps: e.reps ?? 0, tipo: "normal" })),
        observacoes: "",
      }));
    return [];
  });

  // Cronômetro de descanso: guarda o timestamp em que o descanso termina.
  const [descansoFim, setDescansoFim] = useState<number | null>(null);
  const [descansoAlvo, setDescansoAlvo] = useState(DESCANSO_PADRAO);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Salva o treino em andamento a cada mudança, para sobreviver a um reinício do
  // app. Evita gravar um rascunho vazio (treino recém-aberto sem nada).
  const primeiraGravacao = useRef(true);
  useEffect(() => {
    if (primeiraGravacao.current) {
      primeiraGravacao.current = false;
      if (exercicios.length === 0) return;
    }
    db.rascunhoTreino.put({
      id: "atual",
      titulo,
      inicio: inicio.toISOString(),
      exercicios,
      atualizadoEm: new Date().toISOString(),
    });
  }, [exercicios, titulo, inicio]);

  // Agenda o aviso sonoro para o instante exato do fim do descanso.
  useEffect(() => {
    if (!descansoFim) return;
    const ms = descansoFim - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(avisoFimDescanso, ms);
    return () => clearTimeout(t);
  }, [descansoFim]);

  const restanteDescanso = descansoFim ? Math.max(0, Math.ceil((descansoFim - agora) / 1000)) : 0;

  // volume da sessão: conta toda série marcada como feita (a tonelagem soma o
  // que tiver peso×reps). Marcar ✓ já conta, mesmo usando os valores herdados da
  // sessão anterior — sem precisar redigitar.
  const { seriesFeitas, tonelagem } = useMemo(() => {
    let sf = 0, ton = 0;
    for (const ex of exercicios)
      for (const s of ex.sets)
        if (s.feito) {
          sf++;
          ton += s.peso * s.reps;
        }
    return { seriesFeitas: sf, tonelagem: ton };
  }, [exercicios]);

  function addExercicio(nome: string) {
    const n = nome.trim();
    if (!n) return;
    setExercicios((xs) => [...xs, { nome: n, sets: [{ peso: 0, reps: 0, tipo: "normal" }], observacoes: "" }]);
  }
  function addSet(i: number) {
    setExercicios((xs) =>
      xs.map((ex, j) => {
        if (j !== i) return ex;
        const u = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { peso: u?.peso ?? 0, reps: u?.reps ?? 0, tipo: "normal" }] };
      }),
    );
  }
  function setVal(i: number, s: number, campo: "peso" | "reps" | "rir", v: any) {
    setExercicios((xs) =>
      xs.map((ex, j) =>
        j === i ? { ...ex, sets: ex.sets.map((st, k) => (k === s ? { ...st, [campo]: v } : st)) } : ex,
      ),
    );
  }
  function setObservacoesExercicio(i: number, val: string) {
    setExercicios((xs) =>
      xs.map((ex, j) => (j === i ? { ...ex, observacoes: val } : ex))
    );
  }
  async function alterarDescansoExercicio(nome: string, delta: number) {
    const atual = exConfigsMap[nome]?.descansoAlvo ?? DESCANSO_PADRAO;
    const novo = Math.max(15, Math.min(600, atual + delta));
    const configExistente = exConfigsMap[nome];
    await db.exercicioConfigs.put({
      nome,
      descansoAlvo: novo,
      observacaoGeral: configExistente?.observacaoGeral ?? "",
    });
  }
  function toggleFeito(i: number, s: number) {
    let marcou = false;
    let nomeEx = "";
    const ex = exercicios[i];
    if (ex) {
      nomeEx = ex.nome;
      const st = ex.sets[s];
      if (st && !st.feito) {
        marcou = true;
      }
    }

    setExercicios((xs) =>
      xs.map((ex, j) => {
        if (j !== i) return ex;
        const ref = anteriores[ex.nome];
        return {
          ...ex,
          sets: ex.sets.map((st, k) => {
            if (k !== s) return st;
            if (st.feito) return { ...st, feito: false };
            // ao marcar, herda peso/reps da última sessão se o campo estiver vazio
            const prev = ref?.[k] ?? ref?.[ref.length - 1];
            return {
              ...st,
              feito: true,
              peso: st.peso || prev?.peso || 0,
              reps: st.reps || prev?.reps || 0,
            };
          }),
        };
      }),
    );
    // inicia o descanso ao concluir uma série
    if (marcou) {
      const tempo = exConfigsMap[nomeEx]?.descansoAlvo ?? DESCANSO_PADRAO;
      setDescansoFim(Date.now() + tempo * 1000);
      setDescansoAlvo(tempo);
    }
  }
  function removerSet(i: number, s: number) {
    setExercicios((xs) => xs.map((ex, j) => (j === i ? { ...ex, sets: ex.sets.filter((_, k) => k !== s) } : ex)));
  }
  function removerExercicio(i: number) {
    setExercicios((xs) => xs.filter((_, j) => j !== i));
  }

  async function descartarRascunho() {
    await db.rascunhoTreino.delete("atual");
  }

  // Minimizar: mantém o rascunho (aparece "Retomar treino" na aba Treino).
  function minimizar() {
    onFechar();
  }

  // Cancelar: descarta o treino de vez (chamado após confirmação).
  async function cancelarTreino() {
    await descartarRascunho();
    onFechar();
  }

  // Substitui o exercício i por outro, mantendo a contagem de séries (zeradas).
  function substituirExercicio(i: number, nome: string) {
    setExercicios((xs) =>
      xs.map((ex, j) =>
        j === i ? { nome, sets: ex.sets.map(() => ({ peso: 0, reps: 0, tipo: "normal" })), observacoes: "" } : ex,
      ),
    );
  }

  function onEscolherExercicio(nome: string) {
    if (!seletor) return;
    if (seletor.modo === "add") addExercicio(nome);
    else if (seletor.index != null) substituirExercicio(seletor.index, nome);
    setSeletor(null);
  }

  async function concluir() {
    const limpos = exercicios
      .map((ex) => ({
        nome: ex.nome,
        // grava séries marcadas como feitas ou que tenham algum valor digitado
        sets: ex.sets
          .filter((s) => s.feito || s.reps > 0 || s.peso > 0)
          .map((s) => ({ peso: s.peso, reps: s.reps, tipo: s.tipo, rir: s.rir })),
        observacoes: ex.observacoes?.trim() || undefined,
      }))
      .filter((ex) => ex.sets.length > 0);
    if (limpos.length === 0) return minimizar();
    const treino: Treino = {
      id: inicio.toISOString(),
      titulo: titulo.trim() || "Treino",
      inicio: inicio.toISOString(),
      fim: new Date().toISOString(),
      exercicios: limpos,
    };
    const recordesAntes = { ...recordes }; // snapshot antes do save propagar
    await db.treinos.put(treino);
    await descartarRascunho();
    setConcluido({ treino, recordes: recordesAntes });
  }


  if (concluido) {
    return (
      <CardPosTreino
        treino={concluido.treino}
        recordesAnteriores={concluido.recordes}
        onFechar={onFechar}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-md flex-col bg-bg">
      <div className="border-b border-line p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button onClick={minimizar} className="shrink-0 text-sm font-medium text-muted">‹ Minimizar</button>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="flex-1 bg-transparent text-center text-base font-bold outline-none"
          />
          <button
            onClick={() => setConfirmarCancelar(true)}
            aria-label="Descartar treino"
            className="shrink-0 px-1 text-base text-muted"
          >
            <Icone nome="lixeira" tamanho={16} />
          </button>
          <button onClick={concluir} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-bg">
            Concluir
          </button>
        </div>
        {/* Resumo da sessão — números grandes e com contraste alto */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat valor={mmss(agora - inicio.getTime())} rotulo="tempo" />
          <Stat valor={String(seriesFeitas)} rotulo="séries" />
          <Stat valor={tonelagem.toLocaleString("pt-BR")} rotulo="kg total" />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
        {exercicios.map((ex, i) => {
          const recorde = recordes[ex.nome] ?? 0;
          const prevSets = anteriores[ex.nome];
          
          // Encontra a última observação para sugerir como placeholder
          const ultObs = (() => {
            const ordenados = [...treinos].sort((a, b) => b.inicio.localeCompare(a.inicio));
            for (const t of ordenados) {
              const e = t.exercicios.find((exer) => exer.nome === ex.nome);
              if (e && e.observacoes) return e.observacoes;
            }
            return "";
          })();

          const customRest = exConfigsMap[ex.nome]?.descansoAlvo ?? DESCANSO_PADRAO;

          return (
            <div key={i} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExercicioDetalhado(ex.nome)}
                  className="flex-shrink-0 text-left active:scale-95 transition-transform"
                >
                  <ExercicioImagem nome={ex.nome} size={56} interativo={false} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setExercicioDetalhado(ex.nome)}
                    className="text-left font-bold text-base leading-tight hover:text-accent transition-colors outline-none"
                  >
                    {ex.nome}
                  </button>
                  <p className="text-xs text-muted">
                    {grupoDoExercicio(ex.nome)}
                    {recorde > 0 && ` · recorde ${recorde}kg`}
                  </p>
                </div>

                {/* Controles inline de descanso por exercício */}
                <div className="flex items-center gap-1 shrink-0 bg-bg/40 border border-line/50 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => alterarDescansoExercicio(ex.nome, -15)}
                    className="flex h-5 w-5 items-center justify-center rounded text-xs font-black text-muted hover:text-accent active:bg-card/45"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-xs font-extrabold tabular-nums text-fg/80">
                    {mmss(customRest * 1000)}
                  </span>
                  <button
                    type="button"
                    onClick={() => alterarDescansoExercicio(ex.nome, 15)}
                    className="flex h-5 w-5 items-center justify-center rounded text-xs font-black text-muted hover:text-accent active:bg-card/45"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => setSeletor({ modo: "sub", index: i })}
                  aria-label="Substituir exercício"
                  className="px-1 text-base text-muted active:text-accent ml-1"
                >
                  <Icone nome="trocar" tamanho={16} />
                </button>
                <button onClick={() => removerExercicio(i)} className="px-1 text-muted"><Icone nome="x" tamanho={16} /></button>
              </div>

              {/* Campo para Observações do Exercício na Sessão */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder={ultObs ? `Última: "${ultObs}"` : "Observação (ex: máquina regulada no 4)..."}
                  value={ex.observacoes ?? ""}
                  onChange={(e) => setObservacoesExercicio(i, e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg/25 px-3 py-2 text-xs text-fg outline-none placeholder:text-muted/50 focus:border-accent"
                />
              </div>

              {prevSets && prevSets.length > 0 && (
                <p className="mt-2 text-xs text-fg/70 pl-0.5">
                  <span className="text-muted">Última vez:</span>{" "}
                  {prevSets.map((s) => `${s.peso}×${s.reps}`).join(" · ")}
                </p>
              )}

              <div className="mt-3 space-y-1.5">
                <div className="flex gap-2 px-1 text-xs uppercase tracking-wider text-muted">
                  <span className="w-7">set</span>
                  <span className="flex-1">kg</span>
                  <span className="flex-1">reps</span>
                  <span className="w-12 text-center">rir</span>
                  <span className="w-8 text-center">ok</span>
                </div>
                {ex.sets.map((s, k) => {
                  const pr = s.feito && s.reps > 0 && s.peso > recorde && s.peso > 0;
                  const prev = prevSets?.[k];
                  const meta = prev ? (() => {
                    if (prev.peso <= 0 || prev.reps <= 0) return null;
                    if (prev.reps < 10) return { peso: prev.peso, reps: prev.reps + 1 };
                    const delta = prev.peso >= 50 ? 2 : 1;
                    return { peso: prev.peso + delta, reps: prev.reps };
                  })() : null;

                  return (
                    <div key={k} className="space-y-1">
                      <div className={`flex items-center gap-2 rounded-lg p-0.5 ${s.feito ? "bg-accent-soft" : ""}`}>
                        <span className="w-7 text-center text-base font-semibold text-fg">{k + 1}</span>
                        <input
                          type="number" inputMode="decimal" value={s.peso || ""}
                          placeholder={prev ? String(prev.peso) : "kg"}
                          onChange={(e) => setVal(i, k, "peso", parseFloat(e.target.value) || 0)}
                          className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-2.5 text-center text-base font-bold text-fg outline-none placeholder:font-normal placeholder:text-muted/60 focus:border-accent"
                        />
                        <input
                          type="number" inputMode="numeric" value={s.reps || ""}
                          placeholder={prev ? String(prev.reps) : "reps"}
                          onChange={(e) => setVal(i, k, "reps", parseInt(e.target.value, 10) || 0)}
                          className="w-full flex-1 rounded-lg border border-line bg-bg/50 px-2 py-2.5 text-center text-base font-bold text-fg outline-none placeholder:font-normal placeholder:text-muted/60 focus:border-accent"
                        />

                        {/* RIR dropdown */}
                        <div className="flex shrink-0 items-center justify-center w-12">
                          <select
                            value={s.rir ?? ""}
                            onChange={(e) => setVal(i, k, "rir", e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                            className="rounded bg-bg/60 border border-line text-xs font-bold text-fg/80 px-1 py-2 outline-none focus:border-accent"
                          >
                            <option value="">-</option>
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4+</option>
                          </select>
                        </div>

                        <button
                          onClick={() => toggleFeito(i, k)}
                          aria-label={s.feito ? "Desmarcar série" : "Marcar série"}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-base transition-colors ${
                            s.feito ? "border-accent bg-accent text-bg" : "border-muted/50 text-muted/40"
                          }`}
                        >
                          <Icone nome="check" tamanho={16} />
                        </button>
                        <span className="w-4 text-xs">{pr ? <Icone nome="trofeu" tamanho={12} className="text-accent" /> : null}</span>
                        <button onClick={() => removerSet(i, k)} className="w-5 text-lg text-muted">−</button>
                      </div>

                      {meta && !s.feito && (
                        <div className="pl-9 text-xs font-bold text-accent/80 flex items-center gap-1 leading-none pb-1">
                          <span>Sugestão: {meta.peso}kg × {meta.reps} reps</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => addSet(i)} className="mt-1 w-full rounded-lg border border-line py-1.5 text-xs font-semibold text-accent">
                  + série
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setSeletor({ modo: "add" })}
          className="w-full rounded-2xl border border-dashed border-line py-3.5 text-sm font-semibold text-accent active:scale-[0.99]"
        >
          + Adicionar exercício
        </button>
      </div>


      {/* Barra de descanso — rodapé sempre visível */}
      <div className="border-t border-line bg-card px-4 py-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {restanteDescanso > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">descanso</span>
            <span className="text-2xl font-extrabold tabular-nums text-accent">{mmss(restanteDescanso * 1000)}</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setDescansoFim((f) => Math.max(Date.now(), (f ?? Date.now()) - 15000))}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold"
              >
                −15s
              </button>
              <button
                onClick={() => setDescansoFim((f) => (f ?? Date.now()) + 15000)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold"
              >
                +15s
              </button>
              <button
                onClick={() => setDescansoFim(null)}
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-bg"
              >
                pular
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">descanso entre séries</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDescansoAlvo((v) => Math.max(15, v - 15))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-base font-bold"
              >
                −
              </button>
              <span className="w-12 text-center text-base font-extrabold tabular-nums">{mmss(descansoAlvo * 1000)}</span>
              <button
                onClick={() => setDescansoAlvo((v) => Math.min(600, v + 15))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-base font-bold"
              >
                +
              </button>
              <button
                onClick={() => setDescansoFim(Date.now() + descansoAlvo * 1000)}
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-bg active:scale-95 transition-transform"
              >
                iniciar
              </button>
            </div>
          </div>
        )}
      </div>
      {exercicioDetalhado && (
        <ExercicioDetalhesModal
          nome={exercicioDetalhado}
          treinos={treinos}
          onFechar={() => setExercicioDetalhado(null)}
        />
      )}

      {seletor && (
        <SeletorExercicio
          catalogo={catalogo}
          titulo={seletor.modo === "add" ? "Adicionar exercício" : "Substituir exercício"}
          onEscolher={onEscolherExercicio}
          onFechar={() => setSeletor(null)}
        />
      )}

      {confirmarCancelar && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-6">
          <div className="glass w-full max-w-sm rounded-3xl p-5">
            <h3 className="text-lg font-bold">Descartar treino?</h3>
            <p className="mt-1 text-sm text-muted">
              Você perde o que registrou nesta sessão. Para continuar depois, use “Minimizar”.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmarCancelar(false)}
                className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-muted"
              >
                Voltar
              </button>
              <button
                onClick={cancelarTreino}
                className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bloco de estatística do cabeçalho: valor grande e rótulo discreto.
function Stat({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl bg-bg/40 py-2 text-center">
      <p className="text-xl font-extrabold tabular-nums leading-none text-fg">{valor}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">{rotulo}</p>
    </div>
  );
}
