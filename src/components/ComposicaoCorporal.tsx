"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { imc, faixaGordura, metasMedidas, type PerfilFisico } from "@/lib/forca";

// Composição corporal: entrada manual (de qualquer balança) de % de gordura e
// massa muscular, + IMC, faixa de gordura, medidas-alvo e tempo estimado para
// alcançá-las treinando certo.
export function ComposicaoCorporal() {
  const config = useApp((s) => s.config);
  const atualizarPerfil = useApp((s) => s.atualizarPerfil);
  const perfil = config?.perfil;

  const temBase = !!perfil && perfil.pesoCorporal > 0 && (perfil.altura ?? 0) > 0;

  const imcInfo = useMemo(
    () => (temBase ? imc(perfil!.pesoCorporal, perfil!.altura!) : null),
    [temBase, perfil],
  );
  const gord = useMemo(
    () => (perfil?.gorduraPct ? faixaGordura(perfil.gorduraPct, perfil.sexo) : null),
    [perfil],
  );
  const metas = useMemo(() => (perfil ? metasMedidas(perfil as PerfilFisico) : []), [perfil]);

  const [editando, setEditando] = useState(false);

  if (!temBase) {
    return (
      <section className="glass rounded-3xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Composição corporal</h2>
        <p className="mt-2 text-xs text-muted">
          Preencha peso e altura no perfil (em Classificação de força) para ver IMC e metas.
        </p>
      </section>
    );
  }

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">Composição corporal</h2>
        <button
          onClick={() => setEditando((v) => !v)}
          className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold"
        >
          {editando ? "fechar" : "lançar balança"}
        </button>
      </div>

      {editando && <FormBalanca perfil={perfil as PerfilFisico} onSalvar={atualizarPerfil} aoTerminar={() => setEditando(false)} />}

      {/* IMC + gordura */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {imcInfo && (
          <div className="rounded-xl bg-bg/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">IMC</p>
            <p className="text-2xl font-extrabold tabular-nums">{imcInfo.valor.toFixed(1)}</p>
            <p className="text-xs font-semibold" style={{ color: imcInfo.cor }}>{imcInfo.faixa}</p>
          </div>
        )}
        <div className="rounded-xl bg-bg/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted">Gordura</p>
          {perfil?.gorduraPct ? (
            <>
              <p className="text-2xl font-extrabold tabular-nums">{perfil.gorduraPct}%</p>
              {gord && <p className="text-xs font-semibold" style={{ color: gord.cor }}>{gord.faixa}</p>}
            </>
          ) : (
            <p className="mt-2 text-xs text-muted">Lance da balança ↑</p>
          )}
        </div>
      </div>

      {perfil?.massaMuscularKg ? (
        <p className="mt-2 text-xs text-muted">
          Massa muscular: <span className="font-bold tabular-nums text-fg">{perfil.massaMuscularKg} kg</span>
        </p>
      ) : null}

      {/* Metas de medida */}
      <h3 className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-muted">Medidas-alvo</h3>
      {metas.length === 0 ? (
        <p className="rounded-xl bg-bg/40 p-3 text-xs text-muted">
          Preencha suas medidas no perfil para ver os alvos e o tempo estimado.
        </p>
      ) : (
        <div className="space-y-2">
          {metas.map((m) => (
            <div key={m.id} className="rounded-xl bg-bg/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{m.rotulo}</span>
                {m.mesesEstimados == null ? (
                  <span className="text-xs font-bold" style={{ color: m.nivelAlvo.cor }}>no topo ★</span>
                ) : (
                  <span className="text-xs font-bold" style={{ color: m.nivelAlvo.cor }}>→ {m.nivelAlvo.rotulo}</span>
                )}
              </div>
              {m.mesesEstimados != null && (
                <p className="mt-1 text-[11px] text-muted">
                  <span className="tabular-nums text-fg">{m.atual.toFixed(0)}</span> →{" "}
                  <span className="font-bold tabular-nums text-fg">{m.alvo.toFixed(0)} cm</span>{" "}
                  (faltam {m.faltaCm.toFixed(1)} cm) · ~<span className="font-bold">{m.mesesEstimados} {m.mesesEstimados === 1 ? "mês" : "meses"}</span> treinando certo
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-muted">
        IMC não distingue músculo de gordura — leia junto com a % de gordura. O tempo é uma
        estimativa assumindo treino e dieta consistentes; a taxa de ganho cai conforme você avança.
      </p>
    </section>
  );
}

function FormBalanca({
  perfil,
  onSalvar,
  aoTerminar,
}: {
  perfil: PerfilFisico;
  onSalvar: (p: PerfilFisico) => Promise<void>;
  aoTerminar: () => void;
}) {
  const [gordura, setGordura] = useState(perfil.gorduraPct || 0);
  const [musculo, setMusculo] = useState(perfil.massaMuscularKg || 0);
  const [peso, setPeso] = useState(perfil.pesoCorporal || 0);

  async function salvar() {
    await onSalvar({
      ...perfil,
      pesoCorporal: peso > 0 ? peso : perfil.pesoCorporal,
      gorduraPct: gordura > 0 ? gordura : undefined,
      massaMuscularKg: musculo > 0 ? musculo : undefined,
    });
    aoTerminar();
  }

  return (
    <div className="mt-3 rounded-2xl border border-line p-3">
      <p className="mb-2 text-[11px] text-muted">
        Lance os números que sua balança mostrou (qualquer marca):
      </p>
      <div className="grid grid-cols-3 gap-2">
        <NumCampo label="Peso (kg)" valor={peso} onChange={setPeso} />
        <NumCampo label="Gordura %" valor={gordura} onChange={setGordura} />
        <NumCampo label="Músculo (kg)" valor={musculo} onChange={setMusculo} />
      </div>
      <button
        onClick={salvar}
        className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-bg active:scale-95"
      >
        Salvar
      </button>
    </div>
  );
}

function NumCampo({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
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
