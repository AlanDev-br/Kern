"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { cartoesDeHoje } from "@/lib/biblioteca";

export function RevisaoLeituraCard() {
  const cartoes = useApp((s) => s.cartoes);

  const pendentes = useMemo(() => cartoesDeHoje(cartoes), [cartoes]);
  const novos = useMemo(() => cartoes.filter((c) => !c.lido), [cartoes]);

  const destaque = useMemo(() => {
    if (pendentes.length > 0) {
      return {
        tipo: "revisar",
        titulo: "Revisão pendente",
        texto: pendentes[0].pergunta || pendentes[0].titulo,
        autor: pendentes[0].autor,
        linkText: "Revisar conceitos",
        badge: `${pendentes.length} para revisar`,
        cor: "var(--accent)",
        bgBadge: "rgba(var(--glow), 0.15)",
      };
    }
    if (novos.length > 0) {
      return {
        tipo: "ler",
        titulo: "Conceito sugerido",
        texto: novos[0].titulo,
        autor: novos[0].autor,
        linkText: "Explorar novos conceitos",
        badge: `${novos.length} novos`,
        cor: "#a78bfa", // violeta
        bgBadge: "rgba(167, 139, 250, 0.15)",
      };
    }
    if (cartoes.length > 0) {
      const lidos = cartoes.filter((c) => c.lido);
      if (lidos.length > 0) {
        const item = lidos[0];
        return {
          tipo: "reflexao",
          titulo: "Reflexão diária",
          texto: item.titulo,
          autor: item.autor,
          linkText: "Acessar Biblioteca",
          badge: "Em dia ✓",
          cor: "#34d399", // esmeralda
          bgBadge: "rgba(52, 211, 153, 0.15)",
        };
      }
    }
    return null;
  }, [pendentes, novos, cartoes]);

  if (!destaque) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl p-5 border border-line"
      style={{ borderLeft: `4px solid ${destaque.cor}` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">📖</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: destaque.bgBadge, color: destaque.cor }}
        >
          {destaque.badge}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted">
          Leitura & Foco
        </span>
      </div>

      <h2 className="mt-3 text-xs font-bold text-muted uppercase tracking-wider">
        {destaque.titulo}
      </h2>
      <p className="mt-1.5 text-base font-bold leading-snug">{destaque.texto}</p>
      {destaque.autor && (
        <p className="text-xs text-muted mt-1">— {destaque.autor}</p>
      )}

      <div className="mt-4 pt-3 border-t border-line flex justify-between items-center">
        <span className="text-xs text-muted">
          {destaque.tipo === "revisar"
            ? "Fixe o conhecimento na memória"
            : destaque.tipo === "ler"
            ? "Expanda sua mente com aplicação prática"
            : "Reflita sobre os conceitos aprendidos"}
        </span>
        <Link
          href="/biblioteca"
          className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
        >
          {destaque.linkText} →
        </Link>
      </div>
    </motion.section>
  );
}
