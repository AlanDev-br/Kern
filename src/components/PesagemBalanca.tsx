"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { salvarMedida } from "@/lib/db";
import {
  balancaNativa,
  iniciarBle,
  escutarBalanca,
  type LeituraBruta,
  type StatusBalanca,
} from "@/lib/balanca";
import { derivar, type MedidaCorporal, type PerfilFisico } from "@/lib/composicao";

// Pesagem pela balança. O fluxo é: toca em "pesar", sobe descalço, e o card
// mostra o peso oscilando até estabilizar. Quando fecha, o perfil é atualizado
// sozinho — daí a classificação de força, as metas e o avatar reagem sem você
// digitar nada.
//
// O painel de diagnóstico existe porque o layout dos bytes da balança foi
// escrito a partir do protocolo documentado, e firmwares variam. Ele mostra o
// hex cru ao lado do valor interpretado: se o peso bater com a realidade, o
// parser está certo e o painel pode ser ignorado para sempre.

// `fraca` marca o número que existe para constar, não para orientar decisão —
// osso é o caso: nenhuma balança mede, todas estimam, e ele mal se move.
function Metrica({
  rotulo,
  valor,
  nota,
  fraca,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  fraca?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-bg/40 p-3 ${fraca ? "opacity-60" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted">{rotulo}</p>
      <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
      {nota && <p className="text-[11px] text-muted">{nota}</p>}
    </div>
  );
}

function estadoTexto(l: LeituraBruta | null, ativo: boolean): string {
  if (!ativo) return "Toque para começar";
  if (!l) return "Procurando a balança…";
  if (!l.estabilizado) return "Suba e fique parado";
  if (!l.impedancia) return "Peso firme — lendo o corpo";
  return "Pronto";
}

export function PesagemBalanca() {
  const config = useApp((s) => s.config);
  const atualizarPerfil = useApp((s) => s.atualizarPerfil);
  const perfil = config?.perfil;

  const [status, setStatus] = useState<StatusBalanca>("indisponivel");
  const [ativo, setAtivo] = useState(false);
  const [leitura, setLeitura] = useState<LeituraBruta | null>(null);
  const [ultima, setUltima] = useState<MedidaCorporal | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verBytes, setVerBytes] = useState(false);
  const pararRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    void iniciarBle().then(setStatus);
    // Se a tela sair do ar no meio da pesagem, o scan tem de parar junto —
    // scan BLE aberto é consumo de bateria em segundo plano.
    return () => {
      void pararRef.current?.();
    };
  }, []);

  const concluir = useCallback(
    async (m: MedidaCorporal) => {
      setUltima(m);
      setAtivo(false);
      await salvarMedida(m);

      // A pesagem é a fonte de verdade do peso: propaga para o perfil, que é o
      // que o resto do app já consome.
      if (perfil) {
        const d = derivar(m, perfil as PerfilFisico);
        await atualizarPerfil({
          ...perfil,
          pesoCorporal: m.pesoKg,
          // Só sobrescreve gordura e músculo quando houve impedância de verdade;
          // estimativa por IMC não deve apagar um valor que veio de medição.
          ...(m.impedancia
            ? { gorduraPct: d.gorduraPct, massaMuscularKg: d.massaMuscularKg }
            : {}),
        });
      }
    },
    [perfil, atualizarPerfil],
  );

  async function pesar() {
    setErro(null);
    setLeitura(null);
    setUltima(null);

    const s = await iniciarBle();
    setStatus(s);
    if (s !== "pronto") {
      setErro(
        s === "bluetooth-desligado"
          ? "Ligue o Bluetooth para a balança ser ouvida."
          : s === "sem-permissao"
            ? "Permissão de Bluetooth negada. Autorize nas configurações do app."
            : "A leitura da balança só funciona no aplicativo instalado, não no navegador.",
      );
      return;
    }

    setAtivo(true);
    try {
      pararRef.current = await escutarBalanca({
        aoLer: setLeitura,
        aoConcluir: (m) => void concluir(m),
        timeoutSeg: 60,
      });
    } catch {
      setAtivo(false);
      setErro("Não consegui iniciar a busca. Tente de novo.");
    }
  }

  async function cancelar() {
    await pararRef.current?.();
    setAtivo(false);
  }

  const derivada = ultima && perfil ? derivar(ultima, perfil as PerfilFisico) : null;

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider">Balança</h2>
        {ativo ? (
          <button
            onClick={cancelar}
            className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold"
          >
            cancelar
          </button>
        ) : (
          <button
            onClick={pesar}
            className="rounded-lg bg-accent px-3 py-1 text-xs font-bold text-bg"
          >
            pesar
          </button>
        )}
      </div>

      {!balancaNativa() && (
        <p className="mt-2 text-xs text-muted">
          Disponível apenas no aplicativo instalado — o navegador não tem acesso ao Bluetooth
          do aparelho.
        </p>
      )}

      {erro && <p className="mt-2 text-xs text-rose-400">{erro}</p>}

      {/* Peso ao vivo enquanto a balança transmite */}
      {(ativo || ultima) && (
        <div className="mt-4 text-center">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {estadoTexto(leitura, ativo)}
          </p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums">
            {(ultima?.pesoKg ?? leitura?.pesoKg)?.toFixed(1) ?? "—"}
            <span className="ml-1 text-lg font-bold text-muted">kg</span>
          </p>
          {ativo && leitura?.estabilizado && !leitura.impedancia && (
            <p className="mt-1 text-[11px] text-muted">
              Descalço e com os pés cobrindo as faixas de metal
            </p>
          )}
        </div>
      )}

      {/* Resultado da pesagem */}
      {ultima && derivada && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metrica
            rotulo="Gordura"
            valor={`${derivada.gorduraPct}%`}
            nota={derivada.fonteGordura === "bia" ? "por bioimpedância" : "estimada pelo IMC"}
          />
          <Metrica
            rotulo="Massa magra"
            valor={`${derivada.massaMagraKg} kg`}
            nota={`gordura ${derivada.massaGordaKg} kg`}
          />
          {derivada.massaMuscularKg && (
            <Metrica
              rotulo="Músculo"
              valor={`${derivada.massaMuscularKg} kg`}
              nota="esquelético — o que treino move"
            />
          )}
          {derivada.aguaL && (
            <Metrica
              rotulo="Água"
              valor={`${derivada.aguaL} L`}
              nota={`${derivada.aguaPct}% do peso`}
            />
          )}
          <Metrica
            rotulo="Gasto basal"
            valor={`${derivada.tmb}`}
            nota="kcal/dia em repouso"
          />
          {derivada.massaOsseaKg && (
            <Metrica
              rotulo="Ossos"
              valor={`${derivada.massaOsseaKg} kg`}
              nota="estimativa grosseira"
              fraca
            />
          )}
          {!ultima.impedancia && (
            <p className="col-span-2 text-[11px] text-amber-400">
              Sem leitura de bioimpedância nesta pesagem — o peso foi registrado, mas a gordura
              acima é só estimativa por IMC. Refaça descalço, com os pés cobrindo as faixas de
              metal.
            </p>
          )}
        </div>
      )}

      {/* Diagnóstico do protocolo — some da vista quando não interessa */}
      {leitura && (
        <div className="mt-4 border-t border-line pt-3">
          <button
            onClick={() => setVerBytes((v) => !v)}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            {verBytes ? "ocultar" : "ver"} dados brutos
          </button>
          {verBytes && (
            <div className="mt-2 space-y-1 text-[11px] text-muted">
              <p className="break-all font-mono">{leitura.hex}</p>
              <p>
                unidade {leitura.unidade} · {leitura.estabilizado ? "estável" : "oscilando"} ·
                impedância {leitura.impedancia ?? "—"} Ω
              </p>
              {leitura.carimbo && <p>relógio da balança: {leitura.carimbo}</p>}
              <p className="text-amber-400">
                Confira se o peso mostrado bate com a realidade. Se não bater, estes bytes dizem
                onde o valor está.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
