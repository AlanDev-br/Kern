"use client";

import { useMemo, useState } from "react";
import { Icone } from "./Icone";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { db } from "@/lib/db";
import { useApp } from "@/lib/store";
import { derivar, type MedidaCorporal, type PerfilFisico } from "@/lib/composicao";
import {
  IconePeso,
  IconeGordura,
  IconeMusculo,
  IconeAgua,
  IconeVisceral,
  IconeProteina,
  IconeOsso,
  IconeBasal,
  IconeIdade,
  IconeMassaMagra,
} from "./IconesCorpo";

// Histórico e evolução da composição corporal.
//
// Duas decisões que mandam no desenho:
//
// 1. UMA MÉTRICA POR VEZ. Peso e gordura em escalas diferentes no mesmo gráfico
//    exigiriam dois eixos verticais, e gráfico de eixo duplo faz qualquer par de
//    curvas parecer correlacionado — a inclinação vira artefato da escala
//    escolhida. Seletor em cima, um eixo só.
//
// 2. O PONTO É RUÍDO, A LINHA É O SINAL. Cada pesagem entra como ponto
//    discreto; a linha cheia é a média de 7 dias. Água, sal e horário mexem
//    mais que gordura no dia a dia, e quem lê o ponto decide errado.

type ChaveMetrica =
  | "pesoKg"
  | "gorduraPct"
  | "massaMuscularKg"
  | "massaMagraKg"
  | "aguaPct"
  | "gorduraVisceral";

interface DefMetrica {
  chave: ChaveMetrica;
  rotulo: string;
  unidade: string;
  Icone: (p: { className?: string }) => React.ReactElement;
  /** Direção desejada — decide a cor da variação, não a da linha. */
  subirEhBom: boolean;
  casas: number;
}

const METRICAS: DefMetrica[] = [
  { chave: "pesoKg", rotulo: "Peso", unidade: "kg", Icone: IconePeso, subirEhBom: false, casas: 1 },
  { chave: "gorduraPct", rotulo: "Gordura", unidade: "%", Icone: IconeGordura, subirEhBom: false, casas: 1 },
  { chave: "massaMuscularKg", rotulo: "Músculo", unidade: "kg", Icone: IconeMusculo, subirEhBom: true, casas: 1 },
  { chave: "massaMagraKg", rotulo: "Massa magra", unidade: "kg", Icone: IconeMassaMagra, subirEhBom: true, casas: 1 },
  { chave: "aguaPct", rotulo: "Água", unidade: "%", Icone: IconeAgua, subirEhBom: true, casas: 1 },
  { chave: "gorduraVisceral", rotulo: "Visceral", unidade: "", Icone: IconeVisceral, subirEhBom: false, casas: 1 },
];

interface Ponto {
  data: string;
  rotuloX: string;
  valor: number | null;
  media: number | null;
}

/** Média móvel de 7 dias alinhada à direita, calculada sobre a métrica escolhida. */
function montarSerie(
  medidas: MedidaCorporal[],
  perfil: PerfilFisico,
  chave: ChaveMetrica,
): Ponto[] {
  const brutos = medidas
    .map((m) => {
      const d = derivar(m, perfil);
      const valor = chave === "pesoKg" ? m.pesoKg : (d[chave] ?? null);
      return { data: m.data, valor: typeof valor === "number" ? valor : null };
    })
    .filter((p) => p.valor !== null)
    .sort((a, b) => a.data.localeCompare(b.data));

  return brutos.map((p, i) => {
    const janela = brutos.slice(Math.max(0, i - 6), i + 1);
    const soma = janela.reduce((s, x) => s + (x.valor ?? 0), 0);
    const [, mes, dia] = p.data.split("-");
    return {
      data: p.data,
      rotuloX: `${dia}/${mes}`,
      valor: p.valor,
      media: Math.round((soma / janela.length) * 10) / 10,
    };
  });
}

function Variacao({ delta, unidade, bom }: { delta: number; unidade: string; bom: boolean }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="text-xs font-semibold text-muted">sem mudança</span>;
  }
  const subiu = delta > 0;
  const positivo = subiu === bom;
  const cor = positivo ? "var(--accent)" : "#fb7185";
  return (
    <span className="flex items-center gap-1 text-xs font-bold" style={{ color: cor }}>
      {/* Seta desenhada: a direção precisa ser legível sem depender da cor. */}
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
        {subiu ? <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /> : <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" />}
      </svg>
      {subiu ? "+" : ""}
      {delta.toFixed(1)}
      {unidade}
    </span>
  );
}

function Tile({
  Icone,
  rotulo,
  valor,
  nota,
  fraca,
}: {
  Icone: (p: { className?: string }) => React.ReactElement;
  rotulo: string;
  valor: string;
  nota?: string;
  fraca?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-bg/40 p-3 ${fraca ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-1.5 text-muted">
        <Icone className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">{rotulo}</p>
      </div>
      <p className="mt-1 text-xl font-extrabold tabular-nums">{valor}</p>
      {nota && <p className="text-xs leading-tight text-muted">{nota}</p>}
    </div>
  );
}

export function EvolucaoCorporal() {
  const config = useApp((s) => s.config);
  const perfil = config?.perfil;
  const medidas = useLiveQuery(() => db.medidasCorporais.orderBy("data").toArray(), []) ?? [];
  const [ativa, setAtiva] = useState<ChaveMetrica>("pesoKg");

  const def = METRICAS.find((m) => m.chave === ativa)!;
  const serie = useMemo(
    () => (perfil ? montarSerie(medidas, perfil as PerfilFisico, ativa) : []),
    [medidas, perfil, ativa],
  );

  const ultima = medidas.length > 0 ? medidas[medidas.length - 1] : null;
  const derivada = ultima && perfil ? derivar(ultima, perfil as PerfilFisico) : null;

  if (!perfil || medidas.length === 0) {
    return (
      <section className="glass rounded-3xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Evolução corporal</h2>
        <p className="mt-2 text-xs text-muted">
          Nenhuma pesagem registrada ainda. Use a balança acima — o histórico aparece a partir da
          primeira medição.
        </p>
      </section>
    );
  }

  // Variação da média móvel entre a primeira e a última leitura da métrica.
  const delta =
    serie.length >= 2 ? (serie[serie.length - 1].media ?? 0) - (serie[0].media ?? 0) : 0;
  const atual = serie.length > 0 ? serie[serie.length - 1].media : null;

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">Evolução corporal</h2>
        <span className="text-xs text-muted">{medidas.length} pesagens</span>
      </div>

      {/* Seletor: uma métrica por vez, para o gráfico nunca precisar de dois eixos */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {METRICAS.map((m) => {
          const sel = m.chave === ativa;
          return (
            <button
              key={m.chave}
              onClick={() => setAtiva(m.chave)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                sel ? "border-accent bg-accent text-bg" : "border-line bg-card/30 text-muted"
              }`}
            >
              <m.Icone className="h-3.5 w-3.5" />
              {m.rotulo}
            </button>
          );
        })}
      </div>

      {/* Número-herói: a média móvel, não a última pesagem */}
      <div className="mt-4 flex items-end gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            {def.rotulo} — média de 7 dias
          </p>
          <p className="text-4xl font-extrabold tabular-nums leading-none">
            {atual != null ? atual.toFixed(def.casas) : "—"}
            <span className="ml-1 text-base font-bold text-muted">{def.unidade}</span>
          </p>
        </div>
        {serie.length >= 2 && (
          <div className="pb-1">
            <Variacao delta={delta} unidade={def.unidade} bom={def.subirEhBom} />
            <p className="text-xs text-muted">desde a 1ª pesagem</p>
          </div>
        )}
      </div>

      {serie.length < 2 ? (
        <p className="mt-3 rounded-xl border border-line bg-bg/40 p-3 text-xs text-muted">
          Com uma única pesagem não existe direção. A partir da segunda o gráfico aparece — e a
          leitura fica confiável perto da quarta.
        </p>
      ) : (
        <>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.2} />
                <XAxis
                  dataKey="rotuloX"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                  formatter={(v, nome) => [
                    `${Number(v ?? 0).toFixed(def.casas)}${def.unidade}`,
                    nome === "media" ? "média 7 dias" : "pesagem",
                  ]}
                />
                {/* Referência de risco: só faz sentido na gordura visceral */}
                {ativa === "gorduraVisceral" && (
                  <ReferenceLine
                    y={10}
                    stroke="#fb7185"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{ value: "atenção", fill: "#fb7185", fontSize: 12, position: "right" }}
                  />
                )}
                {/* Pesagens cruas: discretas, porque são ruído */}
                <Scatter dataKey="valor" fill="var(--muted)" fillOpacity={0.55} shape="circle" />
                {/* A média é o que se lê */}
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Identidade sem depender só de cor */}
          <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} />
              média de 7 dias
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted opacity-60" />
              pesagem individual
            </span>
          </div>
        </>
      )}

      {/* Última leitura completa */}
      {derivada && ultima && (
        <>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">
            Última medição · {ultima.data.split("-").reverse().join("/")}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Tile Icone={IconePeso} rotulo="Peso" valor={`${ultima.pesoKg} kg`} />
            <Tile
              Icone={IconeGordura}
              rotulo="Gordura"
              valor={`${derivada.gorduraPct}%`}
              nota={`${derivada.massaGordaKg} kg`}
            />
            {derivada.massaMuscularKg && (
              <Tile Icone={IconeMusculo} rotulo="Músculo" valor={`${derivada.massaMuscularKg} kg`} />
            )}
            {derivada.massaMagraKg && (
              <Tile
                Icone={IconeMassaMagra}
                rotulo="Massa magra"
                valor={`${derivada.massaMagraKg} kg`}
              />
            )}
            {derivada.aguaPct && (
              <Tile Icone={IconeAgua} rotulo="Água" valor={`${derivada.aguaPct}%`} />
            )}
            {derivada.proteinaPct && (
              <Tile Icone={IconeProteina} rotulo="Proteína" valor={`${derivada.proteinaPct}%`} />
            )}
            {derivada.gorduraVisceral && (
              <Tile
                Icone={IconeVisceral}
                rotulo="Visceral"
                valor={`${derivada.gorduraVisceral}`}
                nota={
                  derivada.gorduraVisceral < 10
                    ? "saudável"
                    : derivada.gorduraVisceral < 15
                      ? "atenção"
                      : "alto"
                }
              />
            )}
            <Tile
              Icone={IconeBasal}
              rotulo="Gasto basal"
              valor={`${derivada.tmb}`}
              nota="kcal/dia em repouso"
            />
            {derivada.idadeMetabolica && (
              <Tile
                Icone={IconeIdade}
                rotulo="Idade metab."
                valor={`${derivada.idadeMetabolica}`}
                nota="cálculo do Kern"
              />
            )}
            {derivada.massaOsseaKg && (
              <Tile
                Icone={IconeOsso}
                rotulo="Ossos"
                valor={`${derivada.massaOsseaKg} kg`}
                nota="estimativa"
                fraca
              />
            )}
          </div>
        </>
      )}

      {/* Histórico em texto — o gráfico não substitui a tabela */}
      {medidas.length > 1 && (
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted">
            Todas as pesagens
          </summary>
          <ul className="mt-2 space-y-1">
            {[...medidas].reverse().map((m, i, arr) => {
              const anterior = arr[i + 1];
              const dif = anterior ? m.pesoKg - anterior.pesoKg : null;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between border-b border-line/40 py-1.5 text-xs last:border-0"
                >
                  <span className="text-muted">{m.data.split("-").reverse().join("/")}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold tabular-nums">{m.pesoKg} kg</span>
                    {dif !== null && (
                      <span
                        className="tabular-nums text-xs"
                        style={{ color: dif > 0 ? "#fb7185" : dif < 0 ? "var(--accent)" : "var(--muted)" }}
                      >
                        {dif > 0 ? "+" : ""}
                        {dif.toFixed(1)}
                      </span>
                    )}
                    {!m.impedancia && (
                      <span className="text-xs text-amber-400">sem bioimpedância</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
