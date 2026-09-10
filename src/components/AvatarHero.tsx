"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import { nivelDoXp } from "@/lib/xp";
import { rankDoNivel } from "@/lib/rank";
import { carregarModeloParaRankObjectURL, AVATAR_PADRAO_URL } from "@/lib/avatar";
import { Icone } from "@/components/Icone";

// Dentro do executavel de desktop, o preload injeta esta marca. Fora dele
// (celular, navegador) ela nao existe, e o avatar 3D sobe normalmente.
function dentroDoDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { kernDesktop?: { presente?: boolean } }).kernDesktop?.presente;
}

const Avatar3D = dynamic(() => import("@/components/Avatar3D").then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-card/50" />,
});

export function AvatarHero() {
  const ctx = useApp((s) => s.ctx);
  const nivel = nivelDoXp(ctx.xpTotal);
  const rank = rankDoNivel(nivel.nivel);
  const rankIndex = Math.min(Math.max(nivel.nivel - 1, 0), 6);

  const [objUrl, setObjUrl] = useState<string | null>(null);
  // Separa "ainda procurando" de "procurei e não há". Sem isso, um perfil sem
  // modelo embutido nem enviado fica com o esqueleto pulsando para sempre,
  // prometendo um carregamento que nunca vai terminar.
  const [resolvido, setResolvido] = useState(false);

  useEffect(() => {
    let vivo = true;
    const revogar = (u: string | null) => {
      if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
    };
    async function load() {
      // modelo do upload do usuário (blob) ou, na ausência, o base embutido
      const idb = await carregarModeloParaRankObjectURL(rankIndex);
      const u = idb ?? AVATAR_PADRAO_URL;
      if (!vivo) {
        revogar(idb);
        return;
      }
      setObjUrl((prev) => {
        if (prev !== u) revogar(prev);
        return u;
      });
      setResolvido(true);
    }
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", onVis);
      setObjUrl((u) => {
        revogar(u);
        return null;
      });
    };
    // recarrega o modelo quando o rank muda (corpo evolui)
  }, [rankIndex]);

  if (!resolvido) {
    return <div className="h-[40vh] animate-pulse rounded-3xl bg-card/50" />;
  }

  return (
    <section className="relative h-[52vh] overflow-hidden rounded-3xl border border-line">
      {/* aura de fundo na cor do rank (resolve o "muito escuro") */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 25%, rgba(${rank.glow},0.35), rgba(${rank.glow},0.08) 45%, #0a0b12 80%)`,
        }}
      />

      {/* O canvas 3D não sobe dentro do executável de desktop.
          Medido: o processo de GPU do Chromium morre com violação de acesso
          assim que o shader do three.js inicializa, e leva o renderizador
          junto — a janela fecha sozinha, sem erro na tela. Desligar a
          aceleração por hardware reduziu de nove quedas fatais para uma, mas
          não zerou.
          O desktop existe para consultar o histórico, e não para ver o avatar
          girar. Trocar um app que não abre por um app sem canvas é a troca
          certa; no celular, onde o avatar é o centro da tela, nada muda. */}
      {objUrl && !dentroDoDesktop() && (
        <div className="absolute inset-0">
          <Avatar3D url={objUrl} streak={ctx.streakAtual} cor={rank.cor} rankIndex={rankIndex} />
        </div>
      )}

      {/* Sem modelo nenhum: o lugar do corpo convida a criar um, em vez de ficar
          um retângulo vazio no meio da tela de abertura. */}
      {!objUrl && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <Icone nome="espelho" tamanho={34} className="text-muted" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Seu avatar ainda não existe. Crie o seu e ele passa a evoluir junto com o seu rank.
          </p>
        </div>
      )}

      {/* Rank + nível, numa placa opaca. Antes o texto ficava direto sobre o
          degradê e sobre o avatar em 3D, e o contraste variava com o que
          estivesse renderizado atrás: medido em 1,1:1 no pior ponto. Fundo
          conhecido é a única forma de garantir contraste sobre canvas. */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-bg/95 px-3 py-2">
        <span
          className="rounded-lg px-2 py-1 text-sm font-extrabold"
          style={{ background: `rgba(${rank.glow},0.2)`, color: rank.cor }}
        >
          {rank.nome}
        </span>
        <p className="mt-2 text-xs text-muted">Nível {nivel.nivel} · {nivel.nome}</p>
        <p className="text-xs text-muted">{ctx.streakAtual} de streak · {ctx.xpTotal} XP</p>
      </div>

      {/* Alvo de 44px: media 30px, abaixo até do mínimo de 24px do 2.5.8. */}
      <Link
        href="/avatar/"
        className="absolute right-4 top-4 inline-flex min-h-11 items-center rounded-lg border border-line bg-bg/95 px-4 text-xs font-semibold active:scale-95"
      >
        {objUrl ? "Personalizar" : "Criar avatar"}
      </Link>

      {/* lema do rank */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4">
        <p className="rounded-xl bg-bg/95 p-3 text-center text-sm font-medium italic">
          “{rank.lema}”
        </p>
      </div>
    </section>
  );
}
