"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import { nivelDoXp } from "@/lib/xp";
import { rankDoNivel } from "@/lib/rank";
import { temAvatar, carregarAvatarObjectURL } from "@/lib/avatar";

const Avatar3D = dynamic(() => import("@/components/Avatar3D").then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-card/50" />,
});

export function AvatarHero() {
  const ctx = useApp((s) => s.ctx);
  const nivel = nivelDoXp(ctx.xpTotal);
  const rank = rankDoNivel(nivel.nivel);

  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [tem, setTem] = useState<boolean | null>(null);

  async function load() {
    const existe = await temAvatar();
    setTem(existe);
    if (existe) {
      const u = await carregarAvatarObjectURL();
      setObjUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return u;
      });
    }
  }

  useEffect(() => {
    load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      setObjUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tem === null) {
    return <div className="h-[40vh] animate-pulse rounded-3xl bg-card/50" />;
  }

  if (!tem || !objUrl) {
    return (
      <Link
        href="/avatar/"
        className="glass flex h-44 flex-col items-center justify-center gap-2 rounded-3xl text-center active:scale-[0.98]"
      >
        <span className="text-4xl">🧍</span>
        <span className="text-sm font-bold">Monte o seu avatar</span>
        <span className="text-xs text-muted">Ele evolui de rank conforme você cumpre a prova</span>
      </Link>
    );
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

      <div className="absolute inset-0">
        <Avatar3D url={objUrl} streak={ctx.streakAtual} cor={rank.cor} />
      </div>

      {/* rank + nível */}
      <div className="pointer-events-none absolute left-4 top-4">
        <span
          className="rounded-lg px-2 py-1 text-sm font-extrabold"
          style={{ background: `rgba(${rank.glow},0.2)`, color: rank.cor, boxShadow: `0 0 16px rgba(${rank.glow},0.5)` }}
        >
          {rank.nome}
        </span>
        <p className="mt-2 text-xs text-muted">Nível {nivel.nivel} · {nivel.nome}</p>
        <p className="text-xs text-muted">{ctx.streakAtual}🔥 · {ctx.xpTotal} XP</p>
      </div>

      <Link
        href="/avatar/"
        className="absolute right-4 top-4 rounded-lg border border-line bg-bg/40 px-3 py-1.5 text-xs font-semibold backdrop-blur active:scale-95"
      >
        Personalizar
      </Link>

      {/* lema do rank */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4">
        <p className="rounded-xl bg-bg/50 p-3 text-center text-sm font-medium italic backdrop-blur">
          “{rank.lema}”
        </p>
      </div>
    </section>
  );
}
