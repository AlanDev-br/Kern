"use client";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toPng } from "html-to-image";

// Captura um elemento do DOM como PNG e abre o compartilhamento nativo (Android)
// ou o Web Share / download (web). Usado pelo card de pós-treino.
export async function compartilharElemento(
  node: HTMLElement,
  nomeArquivo: string,
  texto: string,
): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#0a0b12",
  });

  if (Capacitor.isNativePlatform()) {
    const base64 = dataUrl.split(",")[1];
    const res = await Filesystem.writeFile({
      path: nomeArquivo,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: texto,
      text: texto,
      files: [res.uri],
      dialogTitle: "Compartilhar treino",
    });
    return;
  }

  // Web: tenta Web Share com arquivo; senão baixa o PNG.
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], nomeArquivo, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files: File[]; text?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], text: texto });
  } else {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = nomeArquivo;
    a.click();
  }
}
