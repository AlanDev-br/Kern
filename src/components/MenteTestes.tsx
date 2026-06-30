"use client";

import { useEffect, useRef, useState } from "react";
import { scoreReacao, scoreDigitos, scoreStroop } from "@/lib/mente";

// Mini-testes cognitivos fundamentados, cada um como overlay. Ao terminar,
// chamam onConcluir(valorBruto, score0a100). Fundo opaco (não deixa o menu vazar).

function Overlay({ children, onFechar }: { children: React.ReactNode; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line px-3 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <button onClick={onFechar} aria-label="Voltar" className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card">←</button>
        <span className="text-sm font-bold">Teste cognitivo</span>
        <div className="w-10" />
      </header>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

// ── 1. Tempo de reação (velocidade de processamento) ────────
export function TesteReacao({
  onConcluir,
  onFechar,
}: {
  onConcluir: (valor: number, score: number) => void;
  onFechar: () => void;
}) {
  const TENTATIVAS = 5;
  const [fase, setFase] = useState<"intro" | "aguardando" | "pronto" | "cedo" | "fim">("intro");
  const [tempos, setTempos] = useState<number[]>([]);
  const inicio = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  function armar() {
    setFase("aguardando");
    const atraso = 1200 + Math.random() * 2800;
    timer.current = window.setTimeout(() => {
      inicio.current = performance.now();
      setFase("pronto");
    }, atraso);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function tocar() {
    if (fase === "intro" || fase === "cedo") {
      armar();
      return;
    }
    if (fase === "aguardando") {
      clearTimeout(timer.current);
      setFase("cedo");
      return;
    }
    if (fase === "pronto") {
      const ms = Math.round(performance.now() - inicio.current);
      const novos = [...tempos, ms];
      setTempos(novos);
      if (novos.length >= TENTATIVAS) {
        const media = Math.round(novos.reduce((a, b) => a + b, 0) / novos.length);
        setFase("fim");
        onConcluir(media, scoreReacao(media));
      } else {
        armar();
      }
    }
  }

  const fundo =
    fase === "pronto" ? "#10b981" : fase === "aguardando" ? "#1e293b" : fase === "cedo" ? "#7f1d1d" : "transparent";

  return (
    <Overlay onFechar={onFechar}>
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h2 className="text-xl font-bold">Tempo de reação</h2>
        <p className="text-sm text-muted">
          Toque assim que a tela ficar <b className="text-emerald-400">verde</b>. Mede sua velocidade de
          processamento. {TENTATIVAS} tentativas.
        </p>
        <button
          onClick={tocar}
          disabled={fase === "fim"}
          className="flex h-72 w-full items-center justify-center rounded-3xl border border-line text-lg font-bold transition-colors"
          style={{ background: fundo }}
        >
          {fase === "intro" && "Toque para começar"}
          {fase === "aguardando" && "Espere o verde…"}
          {fase === "pronto" && "TOQUE!"}
          {fase === "cedo" && "Cedo demais! Toque para tentar de novo"}
          {fase === "fim" && "Concluído ✓"}
        </button>
        {tempos.length > 0 && fase !== "fim" && (
          <p className="text-sm text-muted">{tempos.length}/{TENTATIVAS} · último {tempos[tempos.length - 1]}ms</p>
        )}
        {fase === "fim" && (
          <p className="text-lg font-bold">
            Média: {Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)}ms
          </p>
        )}
      </div>
    </Overlay>
  );
}

// ── 2. Memória de trabalho (digit span) ─────────────────────
export function TesteDigitos({
  onConcluir,
  onFechar,
}: {
  onConcluir: (valor: number, score: number) => void;
  onFechar: () => void;
}) {
  const [fase, setFase] = useState<"intro" | "mostrando" | "respondendo" | "fim">("intro");
  const [span, setSpan] = useState(3);
  const [seq, setSeq] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [resp, setResp] = useState("");
  const [melhor, setMelhor] = useState(0);

  function novaRodada(n: number) {
    setSeq(Array.from({ length: n }, () => Math.floor(Math.random() * 10)));
    setResp("");
    setIdx(0);
    setFase("mostrando");
  }

  // Mostra um dígito por vez (650ms) e depois pede a resposta.
  useEffect(() => {
    if (fase !== "mostrando") return;
    if (idx >= seq.length) {
      const t = setTimeout(() => setFase("respondendo"), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), 650);
    return () => clearTimeout(t);
  }, [fase, idx, seq.length]);

  function conferir() {
    const certo = resp === seq.join("");
    if (certo) {
      setMelhor(span);
      const prox = span + 1;
      setSpan(prox);
      novaRodada(prox);
    } else {
      setFase("fim");
      onConcluir(melhor, scoreDigitos(melhor));
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h2 className="text-xl font-bold">Memória de trabalho</h2>
        <p className="text-sm text-muted">
          Memorize a sequência de dígitos e digite na ordem. Ela cresce a cada acerto. Mede a amplitude da sua
          memória de trabalho.
        </p>

        {fase === "intro" && (
          <button onClick={() => novaRodada(3)} className="w-full rounded-xl bg-accent py-3 font-bold text-bg">
            Começar
          </button>
        )}

        {fase === "mostrando" && (
          <div className="flex h-40 items-center justify-center">
            <span className="text-6xl font-black tabular-nums">{idx < seq.length ? seq[idx] : ""}</span>
          </div>
        )}

        {fase === "respondendo" && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted">Digite os {seq.length} dígitos</p>
            <input
              autoFocus
              value={resp}
              onChange={(e) => setResp(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="w-full rounded-xl border border-line bg-bg/40 p-3 text-center text-2xl tracking-widest tabular-nums"
            />
            <button onClick={conferir} disabled={!resp} className="w-full rounded-xl bg-accent py-3 font-bold text-bg disabled:opacity-40">
              Confirmar
            </button>
          </div>
        )}

        {fase === "fim" && (
          <p className="text-lg font-bold">Maior sequência: {melhor} dígitos</p>
        )}
      </div>
    </Overlay>
  );
}

// ── 3. Atenção e inibição (Stroop) ──────────────────────────
const CORES = [
  { nome: "Vermelho", hex: "#ef4444" },
  { nome: "Azul", hex: "#3b82f6" },
  { nome: "Verde", hex: "#22c55e" },
  { nome: "Amarelo", hex: "#eab308" },
];
const DURACAO_STROOP = 30; // segundos

export function TesteStroop({
  onConcluir,
  onFechar,
}: {
  onConcluir: (valor: number, score: number) => void;
  onFechar: () => void;
}) {
  const [fase, setFase] = useState<"intro" | "jogando" | "fim">("intro");
  const [palavraIdx, setPalavraIdx] = useState(0);
  const [tintaIdx, setTintaIdx] = useState(1);
  const [acertos, setAcertos] = useState(0);
  const [erros, setErros] = useState(0);
  const [restante, setRestante] = useState(DURACAO_STROOP);

  function sortear() {
    const p = Math.floor(Math.random() * CORES.length);
    let t = Math.floor(Math.random() * CORES.length);
    if (t === p && Math.random() < 0.7) t = (t + 1) % CORES.length; // viés para incongruente
    setPalavraIdx(p);
    setTintaIdx(t);
  }

  function comecar() {
    setAcertos(0);
    setErros(0);
    setRestante(DURACAO_STROOP);
    sortear();
    setFase("jogando");
  }

  useEffect(() => {
    if (fase !== "jogando") return;
    if (restante <= 0) {
      const porSeg = acertos / DURACAO_STROOP;
      setFase("fim");
      onConcluir(Math.round(porSeg * 100) / 100, scoreStroop(porSeg));
      return;
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, restante]);

  function responder(idx: number) {
    if (idx === tintaIdx) setAcertos((a) => a + 1);
    else setErros((e) => e + 1);
    sortear();
  }

  return (
    <Overlay onFechar={onFechar}>
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h2 className="text-xl font-bold">Atenção e inibição</h2>
        {fase === "intro" && (
          <>
            <p className="text-sm text-muted">
              Toque na <b>cor da tinta</b> da palavra — ignore o que ela diz. Mede sua atenção e controle inibitório.
              {DURACAO_STROOP}s.
            </p>
            <button onClick={comecar} className="w-full rounded-xl bg-accent py-3 font-bold text-bg">Começar</button>
          </>
        )}

        {fase === "jogando" && (
          <>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>⏱ {restante}s</span>
              <span>✓ {acertos} · ✕ {erros}</span>
            </div>
            <div className="flex h-40 items-center justify-center">
              <span className="text-5xl font-black" style={{ color: CORES[tintaIdx].hex }}>
                {CORES[palavraIdx].nome}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CORES.map((c, i) => (
                <button
                  key={c.nome}
                  onClick={() => responder(i)}
                  className="rounded-xl border border-line py-4 text-sm font-bold active:scale-95"
                  style={{ color: c.hex }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </>
        )}

        {fase === "fim" && (
          <p className="text-lg font-bold">{acertos} acertos · {erros} erros</p>
        )}
      </div>
    </Overlay>
  );
}
