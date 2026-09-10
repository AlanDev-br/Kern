"use client";

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { montarInstantaneo, resumir, type ResumoInstantaneo } from "./instantaneo";
import { idAparelho } from "./identidade";

// ─────────────────────────────────────────────────────────────
// Envio do celular para o desktop, pela rede local
// ─────────────────────────────────────────────────────────────
// Etapa 3 de 3. O sentido é um só, e isso é o desenho e não uma limitação: o
// celular é onde o dia acontece — o treino é registrado na academia, o
// inegociável é marcado na rua — e o desktop existe para OLHAR. Espelho que
// discute com a fonte deixa de ser espelho.
//
// Por isso não há fusão neste caminho: o desktop recebe o retrato e substitui o
// que tem. As regras de fusão continuam em `sincronia-fusao.ts`, prontas para o
// dia em que o computador puder editar também.
//
// Quem faz a requisição é o celular porque o app Android é WebView do
// Capacitor: requisição de saída ele faz sem esforço, mas para SERVIR
// precisaria de plugin nativo. Com o desktop escutando, nenhum código nativo
// novo precisa existir.

export const PORTA_DESKTOP = 8787;

const CHAVE_ULTIMO = "kern_desktop_endereco";

/** O endereço usado da última vez, para não redigitar o IP toda semana. */
export function enderecoLembrado(): string {
  try {
    return localStorage.getItem(CHAVE_ULTIMO) ?? "";
  } catch {
    return "";
  }
}

function lembrarEndereco(ip: string) {
  try {
    localStorage.setItem(CHAVE_ULTIMO, ip);
  } catch {
    /* sem localStorage: o endereço só não é lembrado */
  }
}

/** Normaliza o que o usuário digitou: aceita "192.168.0.5" ou com porta. */
function montarBase(entrada: string): string {
  const limpo = entrada.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return limpo.includes(":") ? `http://${limpo}` : `http://${limpo}:${PORTA_DESKTOP}`;
}

async function pedir(
  url: string,
  opcoes: { metodo: "GET" | "POST"; corpo?: string; codigo?: string },
): Promise<{ status: number; dados: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opcoes.codigo) headers["x-kern-codigo"] = opcoes.codigo;

  // No app, CapacitorHttp: o WebView bloquearia a chamada em texto puro para a
  // rede local, e é justamente essa a chamada que precisamos fazer.
  if (Capacitor.isNativePlatform()) {
    const r =
      opcoes.metodo === "GET"
        ? await CapacitorHttp.get({ url, headers, connectTimeout: 6000, readTimeout: 60000 })
        : await CapacitorHttp.post({ url, headers, data: opcoes.corpo, connectTimeout: 6000, readTimeout: 120000 });
    return { status: r.status, dados: r.data };
  }

  const r = await fetch(url, {
    method: opcoes.metodo,
    headers,
    body: opcoes.corpo,
    signal: AbortSignal.timeout(60000),
  });
  return { status: r.status, dados: await r.json().catch(() => null) };
}

export interface AchadoDesktop {
  maquina: string;
}

/**
 * Confirma que há um Kern escutando naquele endereço, antes de mandar o banco
 * inteiro. Falhar aqui é barato; falhar depois de enviar 20 MB não é.
 */
export async function procurarDesktop(endereco: string): Promise<AchadoDesktop> {
  const { status, dados } = await pedir(`${montarBase(endereco)}/kern/ola`, { metodo: "GET" });
  const d = dados as { app?: string; maquina?: string } | null;
  if (status !== 200 || d?.app !== "kern") {
    throw new Error("Não achei o Kern nesse endereço. O app está aberto no computador?");
  }
  return { maquina: d.maquina ?? "computador" };
}

export interface ResultadoEnvio {
  maquina: string;
  tabelas: ResumoInstantaneo[];
  registros: number;
  bytes: number;
}

/**
 * Envia o retrato do banco para o desktop.
 *
 * O código de pareamento vem da tela do computador. Ele não é criptografia e
 * não finge ser: protege contra mandar para a máquina errada e contra o vizinho
 * de Wi-Fi, não contra ataque.
 */
export async function enviarParaDesktop(endereco: string, codigo: string): Promise<ResultadoEnvio> {
  const achado = await procurarDesktop(endereco);

  const inst = await montarInstantaneo(idAparelho());
  const corpo = JSON.stringify(inst);

  const { status, dados } = await pedir(`${montarBase(endereco)}/kern/instantaneo`, {
    metodo: "POST",
    corpo,
    codigo: codigo.trim(),
  });

  if (status === 403) throw new Error("Código não confere com o que está na tela do computador.");
  if (status === 413) throw new Error("O envio ficou grande demais para a rede local.");
  if (status !== 200) {
    const erro = (dados as { erro?: string } | null)?.erro ?? String(status);
    throw new Error(`O computador recusou o envio (${erro}).`);
  }

  lembrarEndereco(endereco.trim());

  const tabelas = resumir(inst);
  return {
    maquina: achado.maquina,
    tabelas,
    registros: tabelas.reduce((s, t) => s + t.registros, 0),
    bytes: corpo.length,
  };
}
