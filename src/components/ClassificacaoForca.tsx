"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Treino } from "@/lib/db";
import type { Grupo } from "@/lib/musculacao";
import {
  melhores1RM,
  classificar,
  rankGrupos,
  ROTULO_LIFT,
  MEDIDAS,
  type LiftId,
  type PerfilFisico,
} from "@/lib/forca";
import { CorpoRank, type GrupoVisual } from "@/components/CorpoRank";

const ORDEM_LIFTS: LiftId[] = ["supino", "desenvolvimento", "agachamento", "terra", "remada"];

export function ClassificacaoForca({ treinos }: { treinos: Treino[] }) {
  const config = useApp((s) => s.config);
  const xpForca = useApp((s) => s.xpForca);
  const recarregarForca = useApp((s) => s.recarregarForca);
  const perfil = config?.perfil;
  const completo = !!perfil && perfil.pesoCorporal > 0 && perfil.idade > 0 && (perfil.altura ?? 0) > 0;
  const [editando, setEditando] = useState(false);

  // Recalcula a força quando o histórico muda (ex.: após concluir um treino).
  useEffect(() => {
    recarregarForca();
  }, [treinos.length, recarregarForca]);

  if (!completo || editando) {
    return <PerfilForm perfilInicial={perfil} onPronto={() => setEditando(false)} podeFechar={completo} />;
  }

  return (
    <Painel perfil={perfil as PerfilFisico} treinos={treinos} xpForca={xpForca} onEditar={() => setEditando(true)} />
  );
}

function Painel({
  perfil,
  treinos,
  xpForca,
  onEditar,
}: {
  perfil: PerfilFisico;
  treinos: Treino[];
  xpForca: number;
  onEditar: () => void;
}) {
  const best = useMemo(() => melhores1RM(treinos), [treinos]);
  const grupos = useMemo(() => rankGrupos(treinos, perfil), [treinos, perfil]);

  const ranksVisual = useMemo(() => {
    const m: Partial<Record<Grupo, GrupoVisual>> = {};
    for (const r of grupos) m[r.grupo] = { cor: r.nivel.cor, rotulo: r.nivel.rotulo };
    return m;
  }, [grupos]);

  const liftsComDados = ORDEM_LIFTS.filter((l) => (best[l] ?? 0) > 0);

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Classificação de força</h2>
          <p className="text-[11px] text-muted">carga + medidas · vs. média do seu peso e idade</p>
        </div>
        <button onClick={onEditar} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold">
          perfil
        </button>
      </div>

      {/* Mapa do corpo */}
      <div className="mt-4">
        <CorpoRank ranks={ranksVisual} />
      </div>

      {/* Rank por grupo */}
      {grupos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {grupos
            .slice()
            .sort((a, b) => b.nivel.index - a.nivel.index)
            .map((r) => (
              <div key={r.grupo} className="flex items-center justify-between rounded-lg bg-bg/40 px-2.5 py-1.5">
                <span className="text-xs text-muted">{r.grupo}</span>
                <span className="text-xs font-bold" style={{ color: r.nivel.cor }}>
                  {r.nivel.rotulo}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Rank por exercício */}
      <h3 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-muted">Por exercício</h3>
      {liftsComDados.length === 0 ? (
        <p className="rounded-xl bg-bg/40 p-3 text-xs text-muted">
          Registre supino, agachamento, terra, desenvolvimento ou remada para ver seu nível.
        </p>
      ) : (
        <div className="space-y-2">
          {liftsComDados.map((lift) => {
            const c = classificar(lift, best[lift]!, perfil);
            return (
              <div key={lift} className="rounded-xl bg-bg/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{ROTULO_LIFT[lift]}</span>
                  <span className="text-sm font-bold" style={{ color: c.cor }}>
                    {c.rotulo}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(c.progresso * 100)}%`, background: c.cor }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-muted">
                    {Math.round(c.e1rm)}kg{c.alvoProximo ? ` → ${Math.round(c.alvoProximo)}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-xs">
        <span className="text-muted">Recordes renderam</span>{" "}
        <span className="font-bold text-accent">+{xpForca} XP</span>
      </p>
      <p className="mt-1 text-center text-[10px] text-muted">1RM estimado (Epley) · níveis são uma referência aproximada</p>
    </section>
  );
}

// ── Formulário de perfil + medidas ─────────────────────────────────────────
function PerfilForm({
  perfilInicial,
  onPronto,
  podeFechar,
}: {
  perfilInicial?: PerfilFisico;
  onPronto: () => void;
  podeFechar: boolean;
}) {
  const atualizarPerfil = useApp((s) => s.atualizarPerfil);
  const [sexo, setSexo] = useState<"M" | "F">(perfilInicial?.sexo ?? "M");
  const [peso, setPeso] = useState(perfilInicial?.pesoCorporal || 0);
  const [idade, setIdade] = useState(perfilInicial?.idade || 0);
  const [altura, setAltura] = useState(perfilInicial?.altura || 0);
  const [medidas, setMedidas] = useState<Record<string, number>>(perfilInicial?.medidas ?? {});

  const valido = peso > 0 && idade > 0 && altura > 0;

  async function salvar() {
    if (!valido) return;
    await atualizarPerfil({ sexo, pesoCorporal: peso, idade, altura, medidas });
    onPronto();
  }

  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider">Perfil físico</h2>
      <p className="mt-0.5 text-[11px] text-muted">
        Base da classificação. As medidas alimentam o rank de tamanho (braço, panturrilha…).
      </p>

      <div className="mt-3 flex gap-2">
        {(["M", "F"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSexo(s)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
              sexo === s ? "bg-accent text-bg" : "border border-line text-muted"
            }`}
          >
            {s === "M" ? "Masculino" : "Feminino"}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumCampo label="Peso (kg)" valor={peso} onChange={setPeso} />
        <NumCampo label="Idade" valor={idade} onChange={setIdade} />
        <NumCampo label="Altura (cm)" valor={altura} onChange={setAltura} />
      </div>

      <h3 className="mt-4 mb-1 text-xs font-bold uppercase tracking-wider text-muted">Medidas (cm) · opcional</h3>
      <div className="grid grid-cols-3 gap-2">
        {MEDIDAS.map((m) => (
          <NumCampo
            key={m.id}
            label={m.rotulo}
            valor={medidas[m.id] || 0}
            onChange={(v) => setMedidas((md) => ({ ...md, [m.id]: v }))}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        {podeFechar && (
          <button onClick={onPronto} className="flex-1 rounded-2xl border border-line py-3 text-sm font-semibold">
            Cancelar
          </button>
        )}
        <button
          onClick={salvar}
          disabled={!valido}
          className="flex-1 rounded-2xl bg-accent py-3 font-bold text-bg active:scale-95 disabled:opacity-40"
        >
          Salvar perfil
        </button>
      </div>
    </section>
  );
}

function NumCampo({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl bg-bg/40 p-2">
      <label className="mb-0.5 block text-[10px] text-muted">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={valor || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-transparent text-center text-base font-semibold text-fg outline-none"
      />
    </div>
  );
}
