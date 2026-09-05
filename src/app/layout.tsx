import type { Metadata, Viewport } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

// Corpo: Public Sans. Humanista, aberta, desenhada para texto denso de leitura —
// que é o que o app virou depois que o piso de tipo subiu para 13px.
const sans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Títulos e números: Archivo, com o eixo de largura carregado. É uma grotesca
// americana de terminal reto — placa de anilha, número de placar —, e não outra
// geométrica. O par anterior (Manrope + Space Grotesk) era grotesca-geométrica
// nas duas: arquivo diferente, mesmo eixo, contraste nenhum.
//
// `axes: ["wdth"]` traz a largura variável (62,5 a 125), que é o que deixa a
// carga condensar sem perder peso: "5.562,5 kg" cabe na coluna sem encolher.
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kern",
  description: "90 dias. Valor construído para dentro, prova acumulada de promessa cumprida.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kern",
  },
};

// `maximumScale` e `userScalable` foram removidos de propósito: travar a pinça
// reprova o 1.4.4 da WCAG (texto ampliável até 200%) e, num app onde parte do
// texto é pequeno, tira a única saída que sobrava para quem não enxerga bem.
// Não há gesto próprio de pinça no app que precisasse ser protegido.
export const viewport: Viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-full antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
