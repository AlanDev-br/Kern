import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático: requisito do Capacitor (gera /out com HTML/JS puro)
  // e também serve como build da versão PWA web na Vercel.
  output: "export",
  images: {
    unoptimized: true,
  },
  // Garante URLs com barra final, melhor compatibilidade no WebView do Capacitor.
  trailingSlash: true,
  experimental: {
    // O padrão é um worker por núcleo, e com 15 em paralelo a coleta de páginas
    // estoura a memória desta máquina e mata o build (0xC0000409). Quatro
    // workers custam alguns segundos a mais e terminam.
    cpus: 4,
  },
};

export default nextConfig;
