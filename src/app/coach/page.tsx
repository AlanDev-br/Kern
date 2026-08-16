"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useApp } from "@/lib/store";
import { db } from "@/lib/db";
import { diaDoPlano } from "@/lib/dates";
import { volumeSemanal, avaliarVolume } from "@/lib/musculacao";
import { calcularAtributos } from "@/lib/atributos";
import { scoreMente } from "@/lib/mente";
import { nivelDoXp } from "@/lib/xp";
import { derivar, serieComMedia, calcularTendencia } from "@/lib/composicao";
import {
  chamarCoach,
  montarContexto,
  MODELOS_GROQ,
  CHAVE_AMBIENTE,
  MODELO_AMBIENTE,
  type Mensagem,
  type ContextoCoach,
} from "@/lib/ia-coach";

const SUGESTOES = [
  "Analise meu dia e me diga o foco nº1 + 2 ajustes concretos.",
  "Leia minha composição corporal e diga se devo cortar ou comer mais.",
  "Meu treino da semana está bom? O que ajustar pra hipertrofia natural?",
  "Minha cintura e meu percentual de gordura combinam? O que priorizar?",
  "Como começar a manhã pra mudar meu estado mental?",
  "Estou desmotivado hoje. Me ajuda a sair desse estado.",
];

export default function CoachPage() {
  const config = useApp((s) => s.config);
  const atualizarConfig = useApp((s) => s.atualizarConfig);
  const ctx = useApp((s) => s.ctx);
  const xpForca = useApp((s) => s.xpForca);
  const tarefas = useApp((s) => s.tarefas);
  const diaHoje = useApp((s) => s.diaHoje);

  const treinos = useLiveQuery(() => db.treinos.toArray(), []) ?? [];
  const cardios = useLiveQuery(() => db.cardios.toArray(), []) ?? [];
  const avaliacoes = useLiveQuery(() => db.avaliacoesMente.orderBy("data").reverse().toArray(), []) ?? [];
  const testes = useLiveQuery(() => db.testesCognitivos.toArray(), []) ?? [];
  const medidas = useLiveQuery(() => db.medidasCorporais.orderBy("data").toArray(), []) ?? [];

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  // Carrega histórico de conversas salvo no IndexedDB
  useEffect(() => {
    async function carregarHistorico() {
      const salvas = await db.conversasCoach.orderBy("data").toArray();
      if (salvas.length > 0) {
        setMensagens(salvas.map((m) => ({ role: m.role, content: m.content })));
      }
    }
    carregarHistorico();
  }, []);

  async function limparHistorico() {
    if (confirm("Deseja realmente limpar todo o histórico de conversas com o Coach?")) {
      await db.conversasCoach.clear();
      setMensagens([]);
    }
  }

  // Setup. A chave do .env.local (CHAVE_AMBIENTE) ativa o coach automaticamente;
  // a da UI (config.iaApiKey) tem prioridade se o usuário colar uma.
  const [chave, setChave] = useState("");
  const [modelo, setModelo] = useState(MODELOS_GROQ[0].id);
  const chaveEfetiva = config?.iaApiKey || CHAVE_AMBIENTE;
  const modeloEfetivo = config?.iaModelo || MODELO_AMBIENTE || MODELOS_GROQ[0].id;
  const temChave = !!chaveEfetiva;

  const contexto = useMemo<string>(() => {
    if (!config) return "";
    const limite = Date.now() - 7 * 86400000;
    const cardioMin = cardios
      .filter((c) => new Date(c.data).getTime() >= limite)
      .reduce((s, c) => s + c.minutos, 0);

    const melhoresCog: Record<string, number> = {};
    for (const t of testes) {
      if (new Date(t.data).getTime() < Date.now() - 60 * 86400000) continue;
      if (t.score > (melhoresCog[t.tipo] ?? -1)) melhoresCog[t.tipo] = t.score;
    }
    const menteScore = scoreMente(avaliacoes[0] ?? null, melhoresCog);

    const atributos = calcularAtributos({
      ctx,
      xpForca,
      cardioMin: cardios.reduce((s, c) => s + c.minutos, 0),
      treinosCount: treinos.length,
      menteScore,
    }).map((a) => ({ nome: a.nome, valor: a.valor }));

    const volumeMusculo = avaliarVolume(volumeSemanal(treinos))
      .filter((v) => v.series > 0)
      .map((v) => ({ grupo: v.grupo, series: v.series, status: v.status }));

    const inegs = tarefas.filter((t) => t.category === "inegociavel");
    const faltam = inegs.filter((t) => !diaHoje.concluidas.includes(t.id)).map((t) => t.titulo);
    const feitos = inegs.length - faltam.length;
    const inegociaveisHoje = `${feitos}/${inegs.length}${faltam.length ? ` (falta: ${faltam.join(", ")})` : ""}`;

    const p = config.perfil;
    const perfil = p && p.pesoCorporal > 0
      ? `${p.sexo}, ${p.pesoCorporal}kg${p.altura ? `, ${p.altura}cm` : ""}${p.idade ? `, ${p.idade} anos` : ""}`
      : undefined;

    // Composição e tendência: o coach precisa da DIREÇÃO, não do número do dia —
    // pesagem isolada é hidratação, e ele foi instruído a não comentar uma só.
    let composicao: string | undefined;
    let tendenciaPeso: string | undefined;
    if (p && medidas.length > 0) {
      const ultima = medidas[medidas.length - 1];
      const d = derivar(ultima, p);
      const partes = [
        `${ultima.pesoKg}kg`,
        d.gorduraPct ? `${d.gorduraPct}% gordura` : null,
        d.massaMuscularKg ? `${d.massaMuscularKg}kg músculo` : null,
        d.massaMagraKg ? `${d.massaMagraKg}kg massa magra` : null,
        d.aguaPct ? `água ${d.aguaPct}%` : null,
        d.gorduraVisceral ? `visceral ${d.gorduraVisceral}` : null,
        `basal ${d.tmb}kcal`,
        ultima.impedancia ? null : "(sem bioimpedância — gordura só estimada por IMC)",
      ].filter(Boolean);
      composicao = `${partes.join(", ")} — medido em ${ultima.data}`;

      const serie = serieComMedia(medidas, p);
      const t = calcularTendencia(serie);
      if (t.leitura === "sem-dados") {
        tendenciaPeso = `só ${t.amostras} pesagem(ns) — ainda não dá para ler tendência`;
      } else {
        const rotulo =
          t.leitura === "estavel"
            ? "estável (variação dentro do ruído de hidratação)"
            : t.leitura === "perdendo"
              ? `perdendo ${Math.abs(t.kgPorSemana)}kg/semana`
              : `ganhando ${t.kgPorSemana}kg/semana`;
        tendenciaPeso = `${rotulo}, pela média móvel de 7 dias sobre ${t.amostras} pesagens`;
      }
    }

    // Cintura é a métrica que prediz risco melhor que percentual de gordura.
    const med = p?.medidas ?? {};
    const circs = Object.entries(med).filter(([, v]) => v > 0);
    let circunferencias: string | undefined;
    if (circs.length > 0) {
      const lista = circs.map(([k, v]) => `${k} ${v}cm`).join(", ");
      const cintura = med.cintura;
      const razao = cintura && p?.altura ? (cintura / p.altura).toFixed(2) : null;
      circunferencias = razao
        ? `${lista} — razão cintura/altura ${razao} (acima de 0,5 indica excesso central)`
        : lista;
    }

    const nivelInfo = nivelDoXp(ctx.xpTotal);

    // Sumarizar os últimos treinos
    const ultimosTreinos = [...treinos]
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .slice(0, 5)
      .map((t) => {
        const dataStr = new Date(t.inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const resumoExs = t.exercicios.map((e) => {
          const seriesEfetivas = e.sets.filter((s) => s.tipo !== "warmup").length;
          const maxPeso = Math.max(...e.sets.map((s) => s.peso), 0);
          return `${e.nome} (${seriesEfetivas}s, máx ${maxPeso}kg)`;
        }).join(", ");
        return `  * ${dataStr} - ${t.titulo}: ${resumoExs}`;
      })
      .join("\n");

    // Obter recordes pessoais
    const recordesMap: Record<string, { peso: number; reps: number; data: string }> = {};
    for (const t of treinos) {
      const dataStr = new Date(t.inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      for (const ex of t.exercicios) {
        for (const s of ex.sets) {
          if (s.peso > (recordesMap[ex.nome]?.peso ?? 0)) {
            recordesMap[ex.nome] = { peso: s.peso, reps: s.reps, data: dataStr };
          }
        }
      }
    }
    const recordesFormatados = Object.entries(recordesMap)
      .map(([nome, r]) => `  * ${nome}: ${r.peso}kg para ${r.reps} reps (em ${r.data})`)
      .slice(0, 15)
      .join("\n");

    const dados: ContextoCoach = {
      diaPlano: diaDoPlano(config.dataInicio),
      streakAtual: ctx.streakAtual,
      melhorStreak: ctx.melhorStreak,
      diasFechados: ctx.diasFechados,
      inegociaveisHoje,
      atributos,
      volumeMusculo,
      cardioMinSemana: cardioMin,
      conceitosLidos: ctx.conceitosLidos,
      revisoes: ctx.revisoesTotais,
      menteScore,
      perfil,
      composicao,
      tendenciaPeso,
      circunferencias,
      xpTotal: ctx.xpTotal,
      nivel: nivelInfo.nivel,
      nivelNome: nivelInfo.nome,
      historicoTreinos: ultimosTreinos || "Nenhum treino registrado ainda.",
      recordesPessoais: recordesFormatados || "Nenhum recorde registrado ainda.",
    };
    return montarContexto(dados);
  }, [config, ctx, xpForca, tarefas, diaHoje, treinos, cardios, avaliacoes, testes, medidas]);

  async function salvarChave() {
    if (!chave.trim()) return;
    await atualizarConfig({ iaApiKey: chave.trim(), iaModelo: modelo });
    setChave("");
  }

  async function enviar(texto: string) {
    const msg = texto.trim();
    if (!msg || carregando || !chaveEfetiva) return;
    setErro("");
    const novo: Mensagem[] = [...mensagens, { role: "user", content: msg }];
    setMensagens(novo);
    setInput("");
    setCarregando(true);

    // Persiste mensagem do Alan
    await db.conversasCoach.put({
      role: "user",
      content: msg,
      data: new Date().toISOString(),
    });

    try {
      const resposta = await chamarCoach(chaveEfetiva, modeloEfetivo, contexto, novo);
      setMensagens((m) => [...m, { role: "assistant", content: resposta }]);

      // Persiste resposta do Coach
      await db.conversasCoach.put({
        role: "assistant",
        content: resposta,
        data: new Date().toISOString(),
      });

      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao falar com o coach.");
    } finally {
      setCarregando(false);
    }
  }

  // ── Setup da chave ──
  if (!temChave) {
    return (
      <div className="space-y-6">
        <header className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight">Coach IA</h1>
          <p className="text-sm text-muted">Um mentor fundamentado, com os seus dados.</p>
        </header>

        <section className="glass space-y-4 rounded-3xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider">Ativar o coach</h2>
          <p className="text-sm text-muted">
            O coach usa o <strong>Groq</strong> (tem camada gratuita e é rápido). Crie uma chave grátis e cole aqui — ela fica <strong>só no seu aparelho</strong>.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted">
            <li>Abra <span className="text-accent">console.groq.com/keys</span> e faça login.</li>
            <li>Crie uma API key e copie.</li>
            <li>Cole abaixo e salve.</li>
          </ol>
          <input
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder="gsk_..."
            className="w-full rounded-xl border border-line bg-bg/40 p-3 text-sm outline-none focus:border-accent"
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">Modelo</label>
            <select
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg/40 p-3 text-sm"
            >
              {MODELOS_GROQ.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <button
            onClick={salvarChave}
            disabled={!chave.trim()}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-bg disabled:opacity-40"
          >
            Salvar e ativar
          </button>
          <p className="text-[11px] text-muted">
            Nota: por enquanto a chave roda no app (uso pessoal). Para uma versão pública, isso ia para um servidor.
          </p>
        </section>
      </div>
    );
  }

  // ── Chat ──
  return (
    <div className="flex min-h-[70vh] flex-col">
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coach IA</h1>
          <p className="text-sm text-muted">Mentor de corpo, mente e hábitos.</p>
        </div>
        <div className="flex items-center gap-3">
          {mensagens.length > 0 && (
            <button
              onClick={limparHistorico}
              className="text-xs text-rose-400 font-semibold active:scale-95 transition-transform hover:text-rose-300"
            >
              limpar conversa
            </button>
          )}
          {config?.iaApiKey ? (
            <button onClick={() => atualizarConfig({ iaApiKey: undefined })} className="text-xs text-muted underline">
              trocar chave
            </button>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted">via .env</span>
          )}
        </div>
      </header>

      <div className="mt-4 flex-1 space-y-3">
        {mensagens.length === 0 && (
          <div className="space-y-2">
            <p className="px-1 text-sm text-muted">Comece por aqui:</p>
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => enviar(s)}
                className="glass block w-full rounded-2xl p-3.5 text-left text-sm transition-transform active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {mensagens.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-accent-soft text-fg"
                : "glass mr-auto"
            }`}
          >
            {m.content}
          </div>
        ))}

        {carregando && (
          <div className="glass mr-auto max-w-[88%] rounded-2xl p-3.5 text-sm text-muted">pensando…</div>
        )}
        {erro && <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-xs text-rose-300">{erro}</p>}
        <div ref={fimRef} />
      </div>

      {/* Input fixo acima do menu */}
      <div className="sticky bottom-0 mt-3 flex gap-2 bg-bg/80 py-2 backdrop-blur">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar(input)}
          placeholder="Pergunte ao coach…"
          className="flex-1 rounded-xl border border-line bg-bg/40 px-3 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => enviar(input)}
          disabled={carregando || !input.trim()}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg active:scale-95 disabled:opacity-40"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
