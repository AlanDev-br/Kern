"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";

// Gerenciamento de áudio binaural local (Web Audio API)
let audioCtx: AudioContext | null = null;
let leftOsc: OscillatorNode | null = null;
let rightOsc: OscillatorNode | null = null;
let noiseNode: AudioBufferSourceNode | null = null;
let masterGain: GainNode | null = null;

function startBinaural(type: "meditacao" | "foco") {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    // volume bem baixo e agradável
    masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Frequência base agradável (grave)
    const baseFreq = type === "meditacao" ? 150 : 200;
    // Frequência de batimento: 7.83Hz (Schumann / ondas Theta) ou 40Hz (Beta / Foco de alta cognição)
    const beatFreq = type === "meditacao" ? 7.83 : 40;

    // Canal Esquerdo
    leftOsc = audioCtx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

    const leftPanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    if (leftPanner) {
      leftPanner.pan.setValueAtTime(-1, audioCtx.currentTime);
      leftOsc.connect(leftPanner);
      leftPanner.connect(masterGain);
    } else {
      leftOsc.connect(masterGain);
    }

    // Canal Direito
    rightOsc = audioCtx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, audioCtx.currentTime);

    const rightPanner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    if (rightPanner) {
      rightPanner.pan.setValueAtTime(1, audioCtx.currentTime);
      rightOsc.connect(rightPanner);
      rightPanner.connect(masterGain);
    } else {
      rightOsc.connect(masterGain);
    }

    // Gerador de ruído rosa artificial para suavizar o zumbido (binaural puro cansa o cérebro)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = 0.76160 * b5 + white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      output[i] = pink * 0.04; // volume atenuado
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(type === "meditacao" ? 0.25 : 0.12, audioCtx.currentTime);
    noiseNode.connect(noiseGain);
    noiseGain.connect(masterGain);

    leftOsc.start();
    rightOsc.start();
    noiseNode.start();
  } catch (e) {
    console.error("Falha ao iniciar Web Audio API:", e);
  }
}

function stopBinaural() {
  try {
    if (leftOsc) { leftOsc.stop(); leftOsc.disconnect(); leftOsc = null; }
    if (rightOsc) { rightOsc.stop(); rightOsc.disconnect(); rightOsc = null; }
    if (noiseNode) { noiseNode.stop(); noiseNode.disconnect(); noiseNode = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  } catch {
    // ignorar
  }
}

function tocarSomFim() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const t = ctx.currentTime;
    
    // Toca um acorde de sinos suave (G maior)
    const notas = [196.00, 293.66, 392.00, 493.88]; // G3, D4, G4, B4
    notas.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t + idx * 0.1);
      g.gain.setValueAtTime(0.001, t + idx * 0.1);
      g.gain.exponentialRampToValueAtTime(0.2, t + idx * 0.1 + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 2.5);
      o.start(t + idx * 0.1);
      o.stop(t + idx * 0.1 + 3.0);
    });
    setTimeout(() => ctx.close(), 3500);
  } catch {
    // ignorar
  }
}

export function MeditacaoTimer() {
  const completarMeditacao = useApp((s) => s.completarMeditacao);

  const [modo, setModo] = useState<"meditacao" | "foco">("meditacao");
  const [duracao, setDuracao] = useState(15); // minutos
  const [status, setStatus] = useState<"setup" | "playing" | "paused" | "finished">("setup");
  const [tempoRestante, setTempoRestante] = useState(0); // em segundos
  const [audioAtivo, setAudioAtivo] = useState(true);
  const [breathText, setBreathText] = useState("Inalar");

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const inicioRef = useRef<number>(0);

  // Iniciar Cronômetro
  function iniciar() {
    setStatus("playing");
    setTempoRestante(duracao * 60);
    inicioRef.current = Date.now();
    if (audioAtivo) {
      startBinaural(modo);
    }
  }

  // Alternar pausa
  function togglePausa() {
    if (status === "playing") {
      setStatus("paused");
      stopBinaural();
    } else if (status === "paused") {
      setStatus("playing");
      if (audioAtivo) {
        startBinaural(modo);
      }
    }
  }

  // Alternar áudio no meio da sessão
  function toggleAudio() {
    const novo = !audioAtivo;
    setAudioAtivo(novo);
    if (status === "playing") {
      if (novo) {
        startBinaural(modo);
      } else {
        stopBinaural();
      }
    }
  }

  // Cancelar
  function cancelar() {
    setStatus("setup");
    stopBinaural();
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  // Tick do cronômetro
  useEffect(() => {
    if (status === "playing") {
      tickRef.current = setInterval(() => {
        setTempoRestante((t) => {
          if (t <= 1) {
            clearInterval(tickRef.current!);
            tickRef.current = null;
            setStatus("finished");
            stopBinaural();
            tocarSomFim();
            try {
              navigator.vibrate?.([200, 100, 200, 100, 300]);
            } catch { /* sem vibração */ }
            completarMeditacao(duracao, modo);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [status, duracao, modo, completarMeditacao]);

  // Sincronização do guia de respiração (meditação de 16 segundos: 4s inspira, 4s segura, 4s expira, 4s segura)
  useEffect(() => {
    if (modo === "meditacao" && status === "playing") {
      const interval = setInterval(() => {
        const decorrido = Math.floor((Date.now() - inicioRef.current) / 1000);
        const fase = decorrido % 16;
        if (fase < 4) setBreathText("Inalar...");
        else if (fase < 8) setBreathText("Segurar...");
        else if (fase < 12) setBreathText("Exalar...");
        else setBreathText("Segurar...");
      }, 200);
      return () => clearInterval(interval);
    }
  }, [status, modo]);

  // Formatação MM:SS
  const formatado = `${Math.floor(tempoRestante / 60)
    .toString()
    .padStart(2, "0")}:${(tempoRestante % 60).toString().padStart(2, "0")}`;

  return (
    <section className="glass rounded-3xl p-5 space-y-4">
      {/* CSS embutido para animação de respiração */}
      <style>{`
        @keyframes breathe-effect {
          0%, 100% { transform: scale(0.85); opacity: 0.55; }
          25%, 50% { transform: scale(1.15); opacity: 1; }
          75% { transform: scale(0.85); opacity: 0.55; }
        }
        .breathe-animation {
          animation: breathe-effect 16s infinite ease-in-out;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
          🧘 Meditação & Foco
        </h2>
        {status === "playing" && (
          <button
            onClick={toggleAudio}
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${
              audioAtivo ? "border-accent bg-accent-soft text-fg" : "border-line text-muted"
            }`}
          >
            {audioAtivo ? "🔊 Som On" : "🔇 Mudo"}
          </button>
        )}
      </div>

      {status === "setup" && (
        <div className="space-y-4">
          {/* Seletor de Modo */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg/40 p-1 border border-line">
            <button
              onClick={() => setModo("meditacao")}
              className={`rounded-lg py-2.5 text-xs font-bold transition-all ${
                modo === "meditacao" ? "bg-accent text-bg" : "text-muted"
              }`}
            >
              Meditação (7.83Hz)
            </button>
            <button
              onClick={() => setModo("foco")}
              className={`rounded-lg py-2.5 text-xs font-bold transition-all ${
                modo === "foco" ? "bg-accent text-bg" : "text-muted"
              }`}
            >
              Foco Beta (40Hz)
            </button>
          </div>

          {/* Duração */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted px-1">Duração</label>
            <div className="flex gap-1.5">
              {[5, 10, 15, 25, 45].map((min) => (
                <button
                  key={min}
                  onClick={() => setDuracao(min)}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-extrabold tabular-nums transition-colors ${
                    duracao === min ? "border-accent bg-accent-soft text-fg" : "border-line text-muted"
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={iniciar}
            className="w-full rounded-2xl bg-accent py-3.5 text-sm font-bold text-bg active:scale-[0.98] transition-transform"
          >
            Iniciar Sessão (+{duracao} XP)
          </button>
        </div>
      )}

      {(status === "playing" || status === "paused") && (
        <div className="flex flex-col items-center py-6 space-y-6">
          {/* Círculo de Respiração/Pomodoro */}
          <div className="relative flex h-48 w-48 items-center justify-center">
            {/* Círculo guia animado (somente em meditação) */}
            {modo === "meditacao" && status === "playing" && (
              <div className="breathe-animation absolute inset-0 rounded-full bg-accent/15 border border-accent/20" />
            )}
            
            {/* Anel estático de fundo */}
            <div className="absolute inset-0 rounded-full border-4 border-line/45" />

            {/* Conteúdo Central */}
            <div className="z-10 flex flex-col items-center text-center">
              <span className="text-4xl font-extrabold tabular-nums text-fg leading-none">
                {formatado}
              </span>
              <span className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">
                {modo === "meditacao" ? breathText : "Modo Foco"}
              </span>
            </div>
          </div>

          {/* Dicas da frequência tocando no fone */}
          <p className="text-xs text-muted text-center max-w-[85%] leading-normal font-medium">
            {modo === "meditacao" 
              ? "Batimento Theta de 7.83Hz (Ressonância de Schumann) ativo. Respire com o círculo."
              : "Frequência de 40Hz ativa para acelerar o foco de trabalho profundo. Mantenha os fones."}
          </p>

          {/* Controles de Cronômetro */}
          <div className="flex w-full gap-3">
            <button
              onClick={cancelar}
              className="flex-1 rounded-xl border border-line py-3 text-xs font-bold text-muted active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              onClick={togglePausa}
              className="flex-1 rounded-xl bg-accent py-3 text-xs font-bold text-bg active:scale-[0.98]"
            >
              {status === "playing" ? "Pausar" : "Retomar"}
            </button>
          </div>
        </div>
      )}

      {status === "finished" && (
        <div className="flex flex-col items-center py-6 text-center space-y-4">
          <span className="text-5xl">🏆</span>
          <div>
            <h3 className="text-base font-bold">Sessão Concluída!</h3>
            <p className="mt-1 text-xs text-muted">
              Você completou {duracao} minutos de {modo === "meditacao" ? "Meditação" : "Foco Profundo"}.
            </p>
          </div>
          <div className="rounded-full bg-accent/15 border border-accent/20 px-4 py-1.5 text-xs font-bold text-fg">
            +{duracao} XP Adicionados ao seu Perfil
          </div>
          <button
            onClick={() => setStatus("setup")}
            className="w-full rounded-2xl bg-accent py-3 text-xs font-bold text-bg active:scale-[0.98]"
          >
            Concluir
          </button>
        </div>
      )}
    </section>
  );
}
