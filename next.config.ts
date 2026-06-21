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
};

export default nextConfig;
