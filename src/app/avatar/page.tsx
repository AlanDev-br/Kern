"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import { nivelDoXp } from "@/lib/xp";
import {
  temAvatar,
  salvarAvatarDeUrl,
  salvarAvatarDeArquivo,
  carregarAvatarObjectURL,
  removerAvatar,
} from "@/lib/avatar";

const Avatar3D = dynamic(() => import("@/components/Avatar3D").then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-card/50" />,
});

const AVATURN = "https://avaturn.me";

export default function AvatarPage() {
  const ctx = useApp((s) => s.ctx);
  const nivel = nivelDoXp(ctx.xpTotal);

  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [tem, setTem] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    const existe = await temAvatar();
    setTem(existe);
    if (existe) {
      const u = await carregarAvatarObjectURL();
      setObjUrl((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior);
        return u;
      });
    }
  }

  useEffect(() => {
    recarregar();
    return () => {
      setObjUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarDeUrl() {
    if (!url.trim()) return;
    setCarregando(true);
    setMsg("");
    try {
      await salvarAvatarDeUrl(url.trim());
      setUrl("");
      await recarregar();
      setMsg("Avatar carregado!");
    } catch {
      setMsg("Não consegui baixar dessa URL (pode ser bloqueio do servidor). Tente baixar o .glb e usar “Escolher arquivo”.");
    } finally {
      setCarregando(false);
    }
  }

  async function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCarregando(true);
    try {
      await salvarAvatarDeArquivo(file);
      await recarregar();
      setMsg("Avatar carregado!");
    } catch {
      setMsg("Arquivo inválido.");
    } finally {
      setCarregando(false);
    }
  }

  async function trocar() {
    await removerAvatar();
    setObjUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
    setTem(false);
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Avatar</h1>
        <p className="text-sm text-muted">Seu eu em construção — evolui com a sua prova.</p>
      </header>

      {tem && objUrl ? (
        <>
          <div className="glass relative h-[60vh] overflow-hidden rounded-3xl">
            <Avatar3D url={objUrl} streak={ctx.streakAtual} />
            <div className="pointer-events-none absolute left-4 top-4">
              <p className="text-xs text-muted">Nível {nivel.nivel}</p>
              <p className="text-lg font-bold text-gradient">{nivel.nome}</p>
              <p className="mt-1 text-xs text-muted">{ctx.streakAtual}🔥 streak · {ctx.xpTotal} XP</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={AVATURN}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-line py-3 text-center text-sm font-bold active:scale-95"
            >
              Personalizar (Avaturn)
            </a>
            <button
              onClick={trocar}
              className="rounded-xl border border-line py-3 text-sm font-bold active:scale-95"
            >
              Trocar avatar
            </button>
          </div>
          <p className="text-[11px] text-muted">
            A aura e a intensidade refletem o seu streak. Mantenha a consistência pra ele brilhar mais.
          </p>
        </>
      ) : (
        <section className="glass space-y-4 rounded-3xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider">Criar seu avatar</h2>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted">
            <li>Abra o Avaturn e crie a partir de uma selfie sua.</li>
            <li>Exporte/baixe o modelo em <strong>.glb</strong>.</li>
            <li>Volte aqui e <strong>escolha o arquivo</strong> (ou cole o link do .glb).</li>
          </ol>

          <a
            href={AVATURN}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl bg-accent py-3 text-center text-sm font-bold text-bg active:scale-95"
          >
            Abrir Avaturn
          </a>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-line py-3 text-sm font-bold active:scale-95"
          >
            Escolher arquivo .glb
          </button>
          <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" onChange={onArquivo} className="hidden" />

          <div className="border-t border-line pt-3">
            <p className="mb-2 text-xs text-muted">Ou cole o link direto do .glb:</p>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://...glb"
                className="flex-1 rounded-xl border border-line bg-bg/50 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={carregarDeUrl}
                disabled={carregando}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-bg active:scale-95 disabled:opacity-50"
              >
                {carregando ? "..." : "Carregar"}
              </button>
            </div>
          </div>

          {msg && <p className="text-xs text-muted">{msg}</p>}
        </section>
      )}
    </div>
  );
}
