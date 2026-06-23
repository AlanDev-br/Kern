"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/lib/store";
import type { NovoCartao } from "@/lib/store";
import type { CartaoLeitura } from "@/lib/db";
import { cartoesDeHoje, type NotaRevisao } from "@/lib/biblioteca";

type Aba = "revisar" | "explorar" | "adicionar";

export default function BibliotecaPage() {
  const cartoes = useApp((s) => s.cartoes);
  const [aba, setAba] = useState<Aba>("revisar");

  const pendentes = useMemo(() => cartoesDeHoje(cartoes), [cartoes]);

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-muted">
          Conceitos para internalizar — leia, aplique e revise.
        </p>
      </header>

      {/* Abas */}
      <div className="glass flex rounded-2xl p-1">
        <AbaBtn ativa={aba === "revisar"} onClick={() => setAba("revisar")}>
          Revisar{pendentes.length > 0 ? ` (${pendentes.length})` : ""}
        </AbaBtn>
        <AbaBtn ativa={aba === "explorar"} onClick={() => setAba("explorar")}>
          Conceitos
        </AbaBtn>
        <AbaBtn ativa={aba === "adicionar"} onClick={() => setAba("adicionar")}>
          Adicionar
        </AbaBtn>
      </div>

      {aba === "revisar" && <Revisar pendentes={pendentes} />}
      {aba === "explorar" && <Explorar cartoes={cartoes} />}
      {aba === "adicionar" && <Adicionar onPronto={() => setAba("explorar")} />}
    </div>
  );
}

function AbaBtn({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
        ativa ? "bg-accent text-bg" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

// ── Aba: revisar (repetição espaçada) ──────────────────────────────────────
function Revisar({ pendentes }: { pendentes: CartaoLeitura[] }) {
  const revisarCartao = useApp((s) => s.revisarCartao);
  const [revelado, setRevelado] = useState(false);

  const atual = pendentes[0];

  if (!atual) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-3xl">✓</p>
        <p className="mt-2 font-semibold">Revisão em dia</p>
        <p className="mt-1 text-sm text-muted">
          Nenhum conceito para revisar agora. Leia novos conceitos na aba
          Conceitos — eles voltam aqui em intervalos crescentes.
        </p>
      </div>
    );
  }

  async function nota(n: NotaRevisao) {
    await revisarCartao(atual.id, n);
    setRevelado(false); // o card sai da lista; mostra o próximo fechado
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-muted">
        {pendentes.length} {pendentes.length === 1 ? "conceito" : "conceitos"} para revisar
      </p>

      <motion.div
        key={atual.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass min-h-[18rem] rounded-3xl p-6"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-accent">
          {atual.tema}
        </p>
        <h2 className="mt-2 text-lg font-bold leading-snug">
          {atual.pergunta || atual.titulo}
        </h2>

        <AnimatePresence mode="wait">
          {!revelado ? (
            <motion.button
              key="mostrar"
              exit={{ opacity: 0 }}
              onClick={() => setRevelado(true)}
              className="mt-6 w-full rounded-2xl border border-line py-3 text-sm font-semibold text-muted"
            >
              Tentar lembrar e mostrar resposta
            </motion.button>
          ) : (
            <motion.div
              key="resposta"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3"
            >
              <p className="text-sm leading-relaxed">{atual.ideia}</p>
              {atual.citacao && (
                <p className="border-l-2 border-accent pl-3 text-sm italic text-muted">
                  {atual.citacao}
                </p>
              )}
              {atual.aplicacao && (
                <div className="rounded-xl bg-bg/40 p-3 text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-fg">Aplicar hoje: </span>
                  {atual.aplicacao}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {revelado && (
        <div className="grid grid-cols-3 gap-2">
          <BotaoNota cor="#fb7185" onClick={() => nota("dificil")}>
            Difícil
          </BotaoNota>
          <BotaoNota cor="#fbbf24" onClick={() => nota("ok")}>
            Ok
          </BotaoNota>
          <BotaoNota cor="var(--accent)" onClick={() => nota("facil")}>
            Fácil
          </BotaoNota>
        </div>
      )}
    </div>
  );
}

function BotaoNota({
  cor,
  onClick,
  children,
}: {
  cor: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: cor, color: cor }}
      className="rounded-2xl border-2 py-3 text-sm font-bold transition-transform active:scale-95"
    >
      {children}
    </button>
  );
}

// ── Aba: explorar conceitos ────────────────────────────────────────────────
function Explorar({ cartoes }: { cartoes: CartaoLeitura[] }) {
  const porLivro = useMemo(() => {
    const m = new Map<string, CartaoLeitura[]>();
    for (const c of cartoes) {
      const lista = m.get(c.livro) ?? [];
      lista.push(c);
      m.set(c.livro, lista);
    }
    return [...m.entries()];
  }, [cartoes]);

  if (cartoes.length === 0) {
    return (
      <p className="glass rounded-2xl p-6 text-center text-sm text-muted">
        Nenhum conceito ainda.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {porLivro.map(([livro, lista]) => (
        <section key={livro} className="space-y-2">
          <h2 className="px-1 text-sm font-bold text-muted">{livro}</h2>
          {lista.map((c) => (
            <ConceitoItem key={c.id} cartao={c} />
          ))}
        </section>
      ))}
    </div>
  );
}

function ConceitoItem({ cartao }: { cartao: CartaoLeitura }) {
  const lerCartao = useApp((s) => s.lerCartao);
  const removerCartao = useApp((s) => s.removerCartao);
  const [aberto, setAberto] = useState(false);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{cartao.titulo}</p>
          <p className="truncate text-xs text-muted">{cartao.tema}</p>
        </div>
        <span className="shrink-0 text-xs text-muted">
          {cartao.lido ? "✓ lido" : "novo"}
        </span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-line"
          >
            <div className="space-y-3 p-4">
              <p className="text-sm leading-relaxed">{cartao.ideia}</p>
              {cartao.citacao && (
                <p className="border-l-2 border-accent pl-3 text-sm italic text-muted">
                  {cartao.citacao} {cartao.autor ? `— ${cartao.autor}` : ""}
                </p>
              )}
              {cartao.aplicacao && (
                <div className="rounded-xl bg-bg/40 p-3 text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-fg">Aplicar hoje: </span>
                  {cartao.aplicacao}
                </div>
              )}

              {!cartao.lido ? (
                <button
                  onClick={() => lerCartao(cartao.id)}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-bg active:scale-95"
                >
                  Li e refleti · +10 XP
                </button>
              ) : (
                <p className="text-center text-xs text-muted">
                  Próxima revisão: {cartao.proximaRevisao}
                </p>
              )}

              {cartao.origem === "meu" && (
                <button
                  onClick={() => removerCartao(cartao.id)}
                  className="w-full rounded-xl border border-line py-2 text-xs text-muted active:scale-95"
                >
                  Remover trecho
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Aba: adicionar trecho próprio ──────────────────────────────────────────
function Adicionar({ onPronto }: { onPronto: () => void }) {
  const adicionarCartao = useApp((s) => s.adicionarCartao);
  const [f, setF] = useState<NovoCartao>({
    livro: "",
    autor: "",
    tema: "",
    titulo: "",
    ideia: "",
    citacao: "",
    pergunta: "",
  });

  const valido = f.livro.trim() && f.titulo.trim() && (f.ideia.trim() || f.citacao?.trim());

  async function salvar() {
    if (!valido) return;
    await adicionarCartao({
      ...f,
      tema: f.tema.trim() || "Meus trechos",
      ideia: f.ideia.trim() || f.citacao?.trim() || "",
    });
    onPronto();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Capture um trecho que você marcou no livro. Ele entra no ciclo de revisão
        junto com os demais conceitos.
      </p>
      <Campo label="Livro" valor={f.livro} onChange={(v) => setF({ ...f, livro: v })} />
      <Campo label="Autor" valor={f.autor} onChange={(v) => setF({ ...f, autor: v })} />
      <Campo label="Tema" valor={f.tema} onChange={(v) => setF({ ...f, tema: v })} placeholder="ex.: impulsividade" />
      <Campo label="Título do conceito" valor={f.titulo} onChange={(v) => setF({ ...f, titulo: v })} />
      <Area
        label="O trecho que marquei"
        valor={f.citacao ?? ""}
        onChange={(v) => setF({ ...f, citacao: v })}
      />
      <Area
        label="Por que isso importa pra mim"
        valor={f.ideia}
        onChange={(v) => setF({ ...f, ideia: v })}
      />
      <Campo
        label="Pergunta de revisão (opcional)"
        valor={f.pergunta ?? ""}
        onChange={(v) => setF({ ...f, pergunta: v })}
      />

      <button
        onClick={salvar}
        disabled={!valido}
        className="w-full rounded-2xl bg-accent py-3.5 font-bold text-bg transition-transform active:scale-95 disabled:opacity-40"
      >
        Salvar trecho
      </button>
    </div>
  );
}

function Campo({
  label,
  valor,
  onChange,
  placeholder,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted/50"
      />
    </div>
  );
}

function Area({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="glass rounded-2xl p-3">
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none bg-transparent text-sm outline-none"
      />
    </div>
  );
}
