"use client";

import { useState } from "react";

interface MedidaInfo {
  id: string;
  nome: string;
  instrucao: string;
  // Desenha o destaque desta medida sobre o boneco
  renderHighlight: () => React.ReactNode;
}

const METRICS_GUIDE: MedidaInfo[] = [
  {
    id: "ombros",
    nome: "Ombros",
    instrucao: "Passe a fita métrica ao redor da parte mais larga dos ombros (deltoides), geralmente na linha logo abaixo da clavícula. Mantenha os braços relaxados ao lado do corpo.",
    renderHighlight: () => (
      <>
        {/* Linha dos ombros */}
        <line x1="38" y1="46" x2="82" y2="46" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" className="animate-pulse" />
        <circle cx="38" cy="46" r="2.5" fill="var(--accent)" />
        <circle cx="82" cy="46" r="2.5" fill="var(--accent)" />
      </>
    )
  },
  {
    id: "peito",
    nome: "Peito",
    instrucao: "Passe a fita métrica na altura dos mamilos, sobre a parte mais proeminente do peito. Mantenha o peito relaxado e faça a medição após uma expiração normal (sem estufar o peito).",
    renderHighlight: () => (
      <ellipse cx="60" cy="62" rx="18" ry="4.5" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "braco",
    nome: "Braço",
    instrucao: "Meça no ponto médio entre a ponta do ombro (acrômio) e o cotovelo. Pode ser feito com o braço relaxado ao lado do corpo ou contraído/flexionado (o mais comum), desde que você sempre use o mesmo padrão.",
    renderHighlight: () => (
      <ellipse cx="36" cy="78" rx="5" ry="3.5" transform="rotate(-15, 36, 78)" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "antebraco",
    nome: "Antebraço",
    instrucao: "Com o braço estendido e o punho relaxado, passe a fita métrica ao redor da parte de maior circunferência do antebraço, logo abaixo do cotovelo.",
    renderHighlight: () => (
      <ellipse cx="32.5" cy="94" rx="4.2" ry="3" transform="rotate(-15, 32.5, 94)" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "cintura",
    nome: "Cintura",
    instrucao: "Meça na parte mais estreita do seu tronco, normalmente cerca de dois dedos (2 cm) acima do umbigo, na metade do caminho entre a última costela e a crista ilíaca.",
    renderHighlight: () => (
      <ellipse cx="60" cy="90" rx="14.5" ry="3.5" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "quadril",
    nome: "Quadril",
    instrucao: "Fique de pé com os pés juntos e passe a fita métrica na altura da maior circunferência da região dos glúteos.",
    renderHighlight: () => (
      <ellipse cx="60" cy="120" rx="17.5" ry="4.5" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "coxa",
    nome: "Coxa",
    instrucao: "Fique de pé com o peso distribuído igualmente nas duas pernas. Meça no ponto médio entre a dobra da virilha e o topo do joelho (patela) na coxa selecionada.",
    renderHighlight: () => (
      <ellipse cx="73.5" cy="148" rx="8" ry="4" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  },
  {
    id: "panturrilha",
    nome: "Panturrilha",
    instrucao: "Com a perna relaxada e sem apoiar todo o peso do corpo nela, meça na região de maior circunferência (a batata da perna).",
    renderHighlight: () => (
      <ellipse cx="74" cy="184" rx="5.5" ry="3" stroke="var(--accent)" strokeWidth="2.5" fill="var(--accent)" fillOpacity="0.15" className="animate-pulse" />
    )
  }
];

export function GuiaMedidasModal({
  onFechar,
  medidaInicialId
}: {
  onFechar: () => void;
  medidaInicialId?: string;
}) {
  // Os ids daqui são os mesmos de MEDIDAS (forca.ts). Quem chama com chave
  // própria — a tela de config usa "braçoesq", "coxadir" — converte antes.
  // Sem correspondência, abre na primeira medida em vez de ficar em branco.
  const encontrado = METRICS_GUIDE.findIndex((m) => m.id === medidaInicialId);
  const [index, setIndex] = useState(encontrado === -1 ? 0 : encontrado);

  const active = METRICS_GUIDE[index];

  const anterior = () => {
    setIndex((prev) => (prev === 0 ? METRICS_GUIDE.length - 1 : prev - 1));
  };

  const proximo = () => {
    setIndex((prev) => (prev === METRICS_GUIDE.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-bg/95 backdrop-blur-lg pt-[max(0.5rem,env(safe-area-inset-top))]">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-line px-3 pb-3">
        <button
          onClick={onFechar}
          aria-label="Voltar"
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-bold text-muted active:bg-card"
        >
          ←
        </button>
        <h2 className="text-base font-bold tracking-tight">Guia de medição corporal</h2>
        <div className="w-10" />
      </header>

      {/* Boneco + detalhes da medida */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col justify-between space-y-4">
        
        {/* Visor do boneco */}
        <div className="flex-1 flex items-center justify-center min-h-[260px] py-2 relative">
          <div className="w-full max-w-[200px] aspect-[10/22] relative rounded-3xl bg-card/25 border border-line/40 overflow-hidden shadow-2xl">
            <svg viewBox="0 0 120 220" className="w-full h-full" fill="none">
              {/* Malha de fundo */}
              <defs>
                <pattern id="mannequin-grid" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mannequin-grid)" />

              {/* Silhueta do boneco */}
              {/* Cabeça */}
              <circle cx="60" cy="24" r="8.5" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
              
              {/* Coluna */}
              <line x1="60" y1="32.5" x2="60" y2="120" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" />
              
              {/* Linha dos ombros */}
              <line x1="42" y1="46" x2="78" y2="46" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeLinecap="round" />
              
              {/* Contorno do tronco */}
              <path d="M 42 46 C 44 65, 46 80, 48 90 C 47 100, 45 110, 44 120" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" />
              <path d="M 78 46 C 76 65, 74 80, 72 90 C 73 100, 75 110, 76 120" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" />

              {/* Quadril */}
              <line x1="44" y1="120" x2="76" y2="120" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeLinecap="round" />

              {/* Braço esquerdo do boneco */}
              <path d="M 42 46 L 36 78 L 31 106" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Braço direito do boneco */}
              <path d="M 78 46 L 84 78 L 89 106" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Perna esquerda */}
              <path d="M 47 120 L 46 162 L 46 206" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              {/* Perna direita */}
              <path d="M 73 120 L 74 162 L 74 206" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />

              {/* Destaque da medida ativa */}
              {active.renderHighlight()}
            </svg>
          </div>
        </div>

        {/* Painel de informações */}
        <div className="space-y-4">
          
          {/* Abas das medidas */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {METRICS_GUIDE.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setIndex(idx)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold shrink-0 border transition-colors ${
                  index === idx
                    ? "bg-accent border-accent text-bg"
                    : "border-line text-muted bg-card/20"
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>

          {/* Instrução da medida */}
          <div className="glass bg-card/50 border border-line/40 rounded-3xl p-5 shadow-lg relative min-h-[130px]">
            <h3 className="text-sm font-extrabold text-accent flex items-center gap-1.5">
              <span>Medição:</span> {active.nome}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-fg/80 font-medium">
              {active.instrucao}
            </p>
          </div>

          {/* Navegação */}
          <div className="flex gap-3 pb-6">
            <button
              onClick={anterior}
              className="flex-1 rounded-2xl border border-line py-3.5 text-xs font-bold text-fg/90 active:scale-[0.98] transition-transform"
            >
              Anterior
            </button>
            <button
              onClick={proximo}
              className="flex-1 rounded-2xl border border-line py-3.5 text-xs font-bold text-fg/90 active:scale-[0.98] transition-transform"
            >
              Próximo
            </button>
            <button
              onClick={onFechar}
              className="flex-1 rounded-2xl bg-accent py-3.5 text-xs font-black text-bg active:scale-[0.98] transition-transform"
            >
              Entendi
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
