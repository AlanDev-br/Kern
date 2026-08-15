"use client";

// Leitura direta da Xiaomi Mi Body Composition Scale 2 por Bluetooth LE.
//
// A balança não precisa ser pareada nem conectada: ela FAZ BROADCAST do
// resultado no advertisement, no serviço 0x181B (Body Composition). Basta
// escanear enquanto alguém está em cima dela. Isso deixa o Kern independente do
// app Zepp Life e de qualquer conta Xiaomi.
//
// O que vem no ar é só PESO e IMPEDÂNCIA — a composição corporal é derivada
// depois, em `composicao.ts`.

import { Capacitor } from "@capacitor/core";
import { BleClient, type ScanResult } from "@capacitor-community/bluetooth-le";
import type { MedidaCorporal } from "./composicao";

/** Serviço Body Composition. A balança publica o resultado aqui. */
export const SERVICO_BALANCA = "0000181b-0000-1000-8000-00805f9b34fb";
const SERVICO_CURTO = "181b";

export type StatusBalanca =
  | "indisponivel" // rodando na web, sem BLE nativo
  | "sem-permissao"
  | "bluetooth-desligado"
  | "pronto";

/**
 * Leitura crua do advertisement, antes de virar medida. Existe para a tela de
 * diagnóstico: o layout dos bytes abaixo foi escrito a partir do protocolo
 * conhecido da Scale 2, mas variantes de firmware existem — em vez de confiar
 * no papel, a tela mostra o hex recebido e o valor interpretado lado a lado, e
 * a validação acontece com você em cima da balança.
 */
export interface LeituraBruta {
  hex: string;
  bytes: number[];
  pesoKg?: number;
  impedancia?: number;
  estabilizado: boolean;
  temImpedancia: boolean;
  unidade: "kg" | "lb" | "jin";
  carimbo?: string; // data/hora que a própria balança informa
}

const hexDe = (b: number[]) => b.map((x) => x.toString(16).padStart(2, "0")).join(" ");

/**
 * Interpreta os 13 bytes do serviço 0x181B.
 *
 * Layout: [0] controle 1 · [1] controle 2 · [2..3] ano · [4] mês · [5] dia ·
 * [6] hora · [7] min · [8] seg · [9..10] impedância · [11..12] peso — os dois
 * últimos pares em little-endian.
 *
 * O peso vem multiplicado: por 200 em kg (resolução de 5 g) e por 100 nas
 * outras unidades. Configure a balança em kg para não depender disso.
 */
export function interpretar(dv: DataView): LeituraBruta {
  const bytes: number[] = [];
  for (let i = 0; i < dv.byteLength; i++) bytes.push(dv.getUint8(i));

  const base: LeituraBruta = {
    hex: hexDe(bytes),
    bytes,
    estabilizado: false,
    temImpedancia: false,
    unidade: "kg",
  };
  if (dv.byteLength < 13) return base;

  const ctrl1 = dv.getUint8(0);
  const ctrl2 = dv.getUint8(1);

  const unidade: LeituraBruta["unidade"] =
    ctrl1 & 0x01 ? "lb" : ctrl1 & 0x10 ? "jin" : "kg";

  // Bits de estado: o peso só vale quando a balança para de oscilar, e a
  // impedância só existe quando os quatro eletrodos leram o corpo (pé descalço).
  const estabilizado = (ctrl2 & 0x20) !== 0;
  const temImpedancia = (ctrl2 & 0x02) !== 0;

  const impedanciaBruta = dv.getUint16(9, true);
  const pesoBruto = dv.getUint16(11, true);
  const divisor = unidade === "kg" ? 200 : 100;
  const pesoKg = pesoBruto / divisor;

  // A balança carimba a própria data/hora. Serve para descartar leitura repetida
  // e para saber a que pesagem o pacote pertence.
  const ano = dv.getUint16(2, true);
  const carimbo =
    ano > 2000 && ano < 2100
      ? new Date(
          ano,
          dv.getUint8(4) - 1,
          dv.getUint8(5),
          dv.getUint8(6),
          dv.getUint8(7),
          dv.getUint8(8),
        ).toISOString()
      : undefined;

  return {
    ...base,
    unidade,
    estabilizado,
    temImpedancia,
    pesoKg: Number.isFinite(pesoKg) && pesoKg > 2 && pesoKg < 300 ? pesoKg : undefined,
    // Impedância 0 ou saturada significa "não mediu", não "mediu zero".
    impedancia:
      temImpedancia && impedanciaBruta > 0 && impedanciaBruta < 3000
        ? impedanciaBruta
        : undefined,
    carimbo,
  };
}

export function balancaNativa(): boolean {
  return Capacitor.isNativePlatform();
}

export async function iniciarBle(): Promise<StatusBalanca> {
  if (!balancaNativa()) return "indisponivel";
  try {
    await BleClient.initialize({ androidNeverForLocation: true });
    const ligado = await BleClient.isEnabled();
    return ligado ? "pronto" : "bluetooth-desligado";
  } catch {
    return "sem-permissao";
  }
}

/** Extrai o service data da balança de um resultado de scan, se houver. */
function dadosDaBalanca(r: ScanResult): DataView | undefined {
  const sd = r.serviceData;
  if (!sd) return undefined;
  for (const [uuid, valor] of Object.entries(sd)) {
    const u = uuid.toLowerCase();
    if (u === SERVICO_BALANCA || u === SERVICO_CURTO || u.startsWith("0000181b")) {
      return valor as unknown as DataView;
    }
  }
  return undefined;
}

export interface OpcoesEscuta {
  /** Chamado a cada pacote, inclusive instável — alimenta o "subindo na balança". */
  aoLer: (l: LeituraBruta) => void;
  /** Chamado uma vez, quando sai uma medida boa o bastante para gravar. */
  aoConcluir: (m: MedidaCorporal) => void;
  /** Segundos até desistir sozinho. A balança desliga o rádio depois da pesagem. */
  timeoutSeg?: number;
}

/**
 * Escuta a balança até obter uma medida completa.
 *
 * A balança repete o mesmo resultado várias vezes por segundo. A regra de
 * aceitação é: peso estabilizado E impedância presente. Se o peso estabilizar
 * mas a impedância não vier (aconteceu de meia, de chinelo, ou de pé seco
 * demais), depois de `esperaImpedancia` aceitamos só o peso — vale mais um peso
 * registrado do que nenhum, e `composicao.ts` já trata a falta de impedância.
 *
 * Devolve a função para parar a escuta.
 */
export async function escutarBalanca(op: OpcoesEscuta): Promise<() => Promise<void>> {
  const timeout = (op.timeoutSeg ?? 60) * 1000;
  const esperaImpedancia = 8000; // ms após estabilizar o peso

  let concluido = false;
  let primeiroEstavel: number | null = null;
  let melhorSoPeso: LeituraBruta | null = null;
  let timerFim: ReturnType<typeof setTimeout> | null = null;

  const parar = async () => {
    if (timerFim) clearTimeout(timerFim);
    try {
      await BleClient.stopLEScan();
    } catch {
      // scan já encerrado — nada a fazer
    }
  };

  const concluir = (l: LeituraBruta) => {
    if (concluido || !l.pesoKg) return;
    concluido = true;
    const agora = new Date();
    op.aoConcluir({
      // O carimbo da balança é a identidade natural da pesagem; se o relógio
      // dela estiver perdido, o horário do celular resolve.
      id: l.carimbo ?? agora.toISOString(),
      data: (l.carimbo ? new Date(l.carimbo) : agora).toISOString().slice(0, 10),
      pesoKg: Math.round(l.pesoKg * 100) / 100,
      impedancia: l.impedancia,
      origem: "balanca",
    });
    void parar();
  };

  await BleClient.requestLEScan(
    { services: [SERVICO_BALANCA], allowDuplicates: true },
    (r) => {
      const dv = dadosDaBalanca(r);
      if (!dv) return;
      const l = interpretar(dv);
      op.aoLer(l);

      if (!l.estabilizado || !l.pesoKg) return;

      if (l.impedancia) {
        concluir(l);
        return;
      }

      // Peso firme, impedância ainda não. Guarda e dá um tempo para ela chegar.
      melhorSoPeso = l;
      if (primeiroEstavel === null) {
        primeiroEstavel = Date.now();
        setTimeout(() => {
          if (!concluido && melhorSoPeso) concluir(melhorSoPeso);
        }, esperaImpedancia);
      }
    },
  );

  timerFim = setTimeout(() => void parar(), timeout);
  return parar;
}
