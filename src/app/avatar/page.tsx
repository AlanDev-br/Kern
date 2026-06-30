"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import { nivelDoXp } from "@/lib/xp";
import { rankDoNivel } from "@/lib/rank";
import {
  temAvatar,
  salvarAvatarDeUrl,
  salvarAvatarDeArquivo,
  carregarAvatarObjectURL,
  removerAvatar,
  estagiosPreenchidos,
  salvarEstagioDeArquivo,
  removerEstagio,
  NUM_ESTAGIOS,
  ROTULO_ESTAGIO,
  AVATAR_PADRAO_URL,
} from "@/lib/avatar";

const Avatar3D = dynamic(() => import("@/components/Avatar3D").then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-card/50" />,
});

const AVATURN = "https://avaturn.me";

export default function AvatarPage() {
  const ctx = useApp((s) => s.ctx);
  const nivel = nivelDoXp(ctx.xpTotal);
  const rankIndex = Math.min(Math.max(nivel.nivel - 1, 0), 6);

  // Calibração: força um rank só pra visualizar a evolução (não altera o XP real).
  const [rankTeste, setRankTeste] = useState<number | null>(null);
  const rankEfetivo = rankTeste ?? rankIndex;
  const rankInfo = rankDoNivel(rankEfetivo + 1);

  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [tem, setTem] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [estagios, setEstagios] = useState<boolean[]>([]);
  const estagioAlvo = useRef<number>(0);
  const estagioRef = useRef<HTMLInputElement>(null);

  async function recarregar() {
    const existe = await temAvatar();
    setTem(existe);
    setEstagios(await estagiosPreenchidos());
    // usa o upload do usuário (blob) ou o avatar base embutido
    const u = (existe ? await carregarAvatarObjectURL() : null) ?? AVATAR_PADRAO_URL;
    setObjUrl((anterior) => {
      if (anterior && anterior.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return u;
    });
  }

  function escolherEstagio(estagio: number) {
    estagioAlvo.current = estagio;
    estagioRef.current?.click();
  }

  async function onArquivoEstagio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    try {
      await salvarEstagioDeArquivo(estagioAlvo.current, file);
      setEstagios(await estagiosPreenchidos());
      setMsg(`Estágio "${ROTULO_ESTAGIO[estagioAlvo.current]}" salvo!`);
    } catch {
      setMsg("Arquivo inválido.");
    }
  }

  async function limparEstagio(estagio: number) {
    await removerEstagio(estagio);
    setEstagios(await estagiosPreenchidos());
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
    await recarregar(); // volta para o avatar base embutido
    setMsg("Voltou para o avatar base.");
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">Avatar</h1>
        <p className="text-sm text-muted">Seu eu em construção — evolui com a sua prova.</p>
      </header>

      {!objUrl ? (
        <div className="h-[60vh] animate-pulse rounded-3xl bg-card/50" />
      ) : (
        <>
          <div className="glass relative h-[60vh] overflow-hidden rounded-3xl">
            <Avatar3D url={objUrl} streak={ctx.streakAtual} rankIndex={rankEfetivo} cor={rankInfo.cor} />
            <div className="pointer-events-none absolute left-4 top-4">
              <p className="text-xs text-muted">Nível {nivel.nivel}</p>
              <p className="text-lg font-bold text-gradient">{nivel.nome}</p>
              <p className="mt-1 text-xs text-muted">{ctx.streakAtual}🔥 streak · {ctx.xpTotal} XP</p>
            </div>
            {!tem && (
              <span className="absolute right-4 top-4 rounded-lg border border-line bg-bg/50 px-2 py-1 text-[11px] text-muted backdrop-blur">
                Avatar base
              </span>
            )}
          </div>

          {/* Calibração — arraste pra ver a evolução por rank (teste, não muda o XP) */}
          <section className="glass rounded-3xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider">Teste de evolução</h2>
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-extrabold"
                style={{ background: `rgba(${rankInfo.glow},0.2)`, color: rankInfo.cor }}
              >
                {rankInfo.nome}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={rankEfetivo}
              onChange={(e) => setRankTeste(Number(e.target.value))}
              className="mt-3 w-full accent-accent"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted">
              {["E", "D", "C", "B", "A", "S", "★"].map((r) => (
                <span key={r}>{r}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Só pra calibrar o quanto o corpo muda. {rankTeste !== null && (
                <button onClick={() => setRankTeste(null)} className="font-semibold text-accent underline">
                  voltar ao meu rank real
                </button>
              )}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-accent py-3 text-center text-sm font-bold text-bg active:scale-95"
            >
              {tem ? "Trocar meu avatar" : "Usar meu avatar"}
            </button>
            {tem ? (
              <button
                onClick={trocar}
                className="rounded-xl border border-line py-3 text-sm font-bold active:scale-95"
              >
                Voltar ao base
              </button>
            ) : (
              <a
                href={AVATURN}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-line py-3 text-center text-sm font-bold active:scale-95"
              >
                Criar no Avaturn
              </a>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" onChange={onArquivo} className="hidden" />

          {/* Motor de evolução — o corpo cresce sozinho com o rank */}
          <section className="glass space-y-3 rounded-3xl p-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">Motor de evolução</h2>
              <p className="mt-1 text-xs text-muted">
                A partir de <strong>um único modelo</strong>, o app engrossa peito, ombros, braços e coxas e intensifica a aura conforme você sobe de rank (E → Monarca). Não precisa exportar vários corpos.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-bg/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Estágios manuais (opcional)</p>
              <p className="mb-2 mt-1 text-[11px] text-muted">
                Se quiser um corpo feito à mão por faixa, suba um .glb por estágio — ele substitui o motor naquela faixa.
              </p>
              {ROTULO_ESTAGIO.slice(0, NUM_ESTAGIOS).map((rotulo, e) => (
                <div key={e} className="mt-2 flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium">
                    {rotulo}
                    {estagios[e] && <span className="ml-2 text-xs text-accent">✓ salvo</span>}
                  </span>
                  {estagios[e] && (
                    <button
                      onClick={() => limparEstagio(e)}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted active:scale-95"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    onClick={() => escolherEstagio(e)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold active:scale-95"
                  >
                    {estagios[e] ? "Trocar" : "Subir .glb"}
                  </button>
                </div>
              ))}
              <input
                ref={estagioRef}
                type="file"
                accept=".glb,model/gltf-binary"
                onChange={onArquivoEstagio}
                className="hidden"
              />
            </div>

            {/* Avançado: carregar por link */}
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-xs text-muted">Avançado — carregar avatar por link .glb:</p>
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
        </>
      )}
    </div>
  );
}
