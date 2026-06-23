"use client";

import type { Grupo } from "@/lib/musculacao";

// Mapa do corpo (frente e costas) com cada músculo colorido pelo rank do grupo.
// Design estético de HUD biométrico futurista com efeitos de neon, transparência e pulsação.

export interface GrupoVisual {
  cor: string;
  rotulo: string; // ex.: "Ouro 2"
}

const NEUTRO_FILL = "rgba(255, 255, 255, 0.03)";
const NEUTRO_STROKE = "rgba(255, 255, 255, 0.08)";
const NEUTRO_STROKE_WIDTH = "0.5";

export function CorpoRank({ ranks }: { ranks: Partial<Record<Grupo, GrupoVisual>> }) {
  const titulo = (g: Grupo) => `${g}${ranks[g] ? `: ${ranks[g]!.rotulo}` : ""}`;

  // Helper para obter os atributos de estilo de cada músculo
  const propsMsc = (g: Grupo) => {
    const visual = ranks[g];
    if (visual) {
      return {
        fill: `color-mix(in srgb, ${visual.cor} 25%, transparent)`,
        stroke: `color-mix(in srgb, ${visual.cor} 80%, white)`,
        strokeWidth: "1",
        className: "muscle-active transition-all duration-300 hover:brightness-125 cursor-pointer",
        style: { "--glow-color": visual.cor } as React.CSSProperties,
      };
    } else {
      return {
        fill: NEUTRO_FILL,
        stroke: NEUTRO_STROKE,
        strokeWidth: NEUTRO_STROKE_WIDTH,
        className: "transition-all duration-300 hover:fill-white/[0.06]",
      };
    }
  };

  // Silhueta do corpo compartilhada (frente e costas)
  const silhuetaCorpo = (
    <path
      d="M50,4 C57,4 61,10 61,16 C61,22 57,26 53,27 L53,30 C61,31 69,35 73,43 C76,49 76,56 78,64 C80,72 82,82 82,90 C82,94 79,97 75,96 C72,95 72,92 72,87 C71,78 70,68 68,61 C67,58 64,52 64,52 L64,74 C64,78 61,84 60,88 C58,95 56,108 56,128 C56,140 58,154 58,168 C58,173 53,178 48,178 C43,178 38,173 38,168 C38,154 40,140 40,128 C40,108 38,95 36,88 C35,84 32,78 32,74 L32,52 C32,52 29,58 28,61 C26,68 25,78 24,87 C24,92 24,95 21,96 C17,97 14,94 14,90 C14,82 16,72 18,64 C20,56 20,49 23,43 C27,35 35,31 43,30 L43,27 C39,26 35,22 35,16 C35,10 39,4 47,4 Z"
      fill="rgba(255, 255, 255, 0.01)"
      stroke="rgba(255, 255, 255, 0.04)"
      strokeWidth="0.5"
    />
  );

  // Fundo de grade HUD para cada figura
  const hudBackground = (
    <>
      <circle cx="50" cy="90" r="85" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.5" strokeDasharray="2 4" />
      <circle cx="50" cy="90" r="55" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5" strokeDasharray="1 3" />
      <line x1="50" y1="5" x2="50" y2="175" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5" strokeDasharray="2 4" />
      <line x1="5" y1="90" x2="95" y2="90" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5" strokeDasharray="2 4" />
    </>
  );

  return (
    <div className="flex items-start justify-center gap-6 py-2">
      {/* Estilos CSS para efeito de neon pulsante nos músculos com rank ativo */}
      <style>{`
        @keyframes pulse-neon {
          0% {
            fill-opacity: 0.25;
            stroke-opacity: 0.6;
            filter: drop-shadow(0 0 2px var(--glow-color));
          }
          50% {
            fill-opacity: 0.6;
            stroke-opacity: 1;
            filter: drop-shadow(0 0 10px var(--glow-color));
          }
          100% {
            fill-opacity: 0.25;
            stroke-opacity: 0.6;
            filter: drop-shadow(0 0 2px var(--glow-color));
          }
        }
        .muscle-active {
          animation: pulse-neon 2.5s infinite ease-in-out;
        }
      `}</style>

      {/* FRENTE */}
      <Figura titulo="Frente">
        <svg viewBox="0 0 100 180" className="w-full max-w-[150px]" role="img" aria-label="Corpo - Vista Frontal">
          {hudBackground}
          {silhuetaCorpo}
          
          {/* Cabeça e Pescoço (neutros) */}
          <circle cx="50" cy="15" r="9" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M46,23 C46,26 54,26 54,23 L53,28 H47 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Ombros (Deltoides) */}
          <path d="M42,28 C39,29 35,32 32,38 C29,43 30,49 33,52 C35,46 39,40 43,36 Z" {...propsMsc("Ombros")}><title>{titulo("Ombros")}</title></path>
          <path d="M58,28 C61,29 65,32 68,38 C71,43 70,49 67,52 C65,46 61,40 57,36 Z" {...propsMsc("Ombros")}><title>{titulo("Ombros")}</title></path>
          
          {/* Peito (Peitoral) */}
          <path d="M49,30 H43 C39,32 37,40 36,46 C41,47 45,43 49,41 Z" {...propsMsc("Peito")}><title>{titulo("Peito")}</title></path>
          <path d="M51,30 H57 C61,32 63,40 64,46 C59,47 55,43 51,41 Z" {...propsMsc("Peito")}><title>{titulo("Peito")}</title></path>
          
          {/* Bíceps */}
          <path d="M31,48 C28,52 26,59 26,66 C28,68 31,67 32,65 C34,59 35,53 33,49 Z" {...propsMsc("Bíceps")}><title>{titulo("Bíceps")}</title></path>
          <path d="M69,48 C72,52 74,59 74,66 C72,68 69,67 68,65 C66,59 65,53 67,49 Z" {...propsMsc("Bíceps")}><title>{titulo("Bíceps")}</title></path>
          
          {/* Antebraço (neutro) */}
          <path d="M25,66 C23,71 21,79 21,87 C23,89 25,88 26,85 C28,79 29,72 28,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M75,66 C77,71 79,79 79,87 C77,89 75,88 74,85 C72,79 71,72 72,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Mãos (neutras) */}
          <circle cx="19" cy="93" r="3.5" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <circle cx="81" cy="93" r="3.5" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Core (Abdômen/Oblíquos com linhas de seis gomos) */}
          <g>
            <path d="M43,41 C42,50 41,63 40,74 C47,76 53,76 60,74 C59,50 58,41 57,41 Z" {...propsMsc("Core")} />
            {/* Linhas de definição do abdômen */}
            <path d="M44,48 Q50,49 56,48 M43,56 Q50,57 57,56 M42,64 Q50,65 58,64" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" fill="none" pointerEvents="none" />
            <title>{titulo("Core")}</title>
          </g>
          
          {/* Quadril (neutro) */}
          <path d="M40,74 C39,78 39,81 41,83 H59 C61,81 61,78 60,74 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Quadríceps */}
          <path d="M40,84 C36,98 33,115 33,130 C37,132 42,131 44,127 C45,114 46,98 45,84 Z" {...propsMsc("Quadríceps")}><title>{titulo("Quadríceps")}</title></path>
          <path d="M60,84 C64,98 67,115 67,130 C63,132 58,131 56,127 C55,114 54,98 55,84 Z" {...propsMsc("Quadríceps")}><title>{titulo("Quadríceps")}</title></path>
          
          {/* Joelhos (neutros) */}
          <ellipse cx="36" cy="133" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <ellipse cx="64" cy="133" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Panturrilha Frontal (neutras nesta vista) */}
          <path d="M34,136 C33,147 32,159 32,170 C35,171 38,170 39,167 C40,157 41,146 42,136 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M66,136 C67,147 68,159 68,170 C65,171 62,170 61,167 C60,157 59,146 58,136 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Pés (neutros) */}
          <path d="M32,170 L30,177 H38 L37,170 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M68,170 L70,177 H62 L63,170 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
        </svg>
      </Figura>

      {/* COSTAS */}
      <Figura titulo="Costas">
        <svg viewBox="0 0 100 180" className="w-full max-w-[150px]" role="img" aria-label="Corpo - Vista Traseira">
          {hudBackground}
          {silhuetaCorpo}
          
          {/* Cabeça e Pescoço (neutros) */}
          <circle cx="50" cy="15" r="9" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M46,23 C46,26 54,26 54,23 L53,28 H47 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Ombros (Posterior) */}
          <path d="M42,28 C39,29 35,32 32,38 C29,43 30,49 33,52 C35,46 39,40 43,36 Z" {...propsMsc("Ombros")}><title>{titulo("Ombros")}</title></path>
          <path d="M58,28 C61,29 65,32 68,38 C71,43 70,49 67,52 C65,46 61,40 57,36 Z" {...propsMsc("Ombros")}><title>{titulo("Ombros")}</title></path>
          
          {/* Costas / Asas / Dorsal */}
          <path d="M43,30 H57 L63,45 C57,48 43,48 37,45 Z M37,45 C36,53 37,63 41,74 C47,75 53,75 59,74 C63,63 64,53 63,45 Z" {...propsMsc("Costas")}><title>{titulo("Costas")}</title></path>
          
          {/* Tríceps */}
          <path d="M31,48 C28,52 26,59 26,66 C28,68 31,67 32,65 C34,59 35,53 33,49 Z" {...propsMsc("Tríceps")}><title>{titulo("Tríceps")}</title></path>
          <path d="M69,48 C72,52 74,59 74,66 C72,68 69,67 68,65 C66,59 65,53 67,49 Z" {...propsMsc("Tríceps")}><title>{titulo("Tríceps")}</title></path>
          
          {/* Antebraço (neutro) */}
          <path d="M25,66 C23,71 21,79 21,87 C23,89 25,88 26,85 C28,79 29,72 28,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M75,66 C77,71 79,79 79,87 C77,89 75,88 74,85 C72,79 71,72 72,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Mãos (neutras) */}
          <circle cx="19" cy="93" r="3.5" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <circle cx="81" cy="93" r="3.5" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Glúteos */}
          <path d="M41,74 C38,78 39,87 46,89 C53,89 55,83 55,74 Z" {...propsMsc("Glúteos")}><title>{titulo("Glúteos")}</title></path>
          <path d="M59,74 C62,78 61,87 54,89 C47,89 45,83 45,74 Z" {...propsMsc("Glúteos")}><title>{titulo("Glúteos")}</title></path>
          
          {/* Posteriores de Coxa */}
          <path d="M40,90 C36,104 33,122 33,138 C37,140 42,139 44,135 C45,122 46,104 45,90 Z" {...propsMsc("Posteriores")}><title>{titulo("Posteriores")}</title></path>
          <path d="M60,90 C64,104 67,122 67,138 C63,140 58,139 56,135 C55,122 54,104 55,90 Z" {...propsMsc("Posteriores")}><title>{titulo("Posteriores")}</title></path>
          
          {/* Joelhos (neutros) */}
          <ellipse cx="36" cy="141" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <ellipse cx="64" cy="141" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          
          {/* Panturrilhas */}
          <path d="M34,144 C32,154 31,166 32,174 C35,175 38,174 39,171 C40,166 41,154 42,144 Z" {...propsMsc("Panturrilha")}><title>{titulo("Panturrilha")}</title></path>
          <path d="M66,144 C68,154 69,166 68,174 C65,175 62,174 61,171 C60,166 59,154 58,144 Z" {...propsMsc("Panturrilha")}><title>{titulo("Panturrilha")}</title></path>
          
          {/* Pés (neutros) */}
          <path d="M32,170 L30,177 H38 L37,170 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M68,170 L70,177 H62 L63,170 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
        </svg>
      </Figura>
    </div>
  );
}

function Figura({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      {children}
      <span className="mt-2 text-[10px] uppercase tracking-wider text-muted font-bold">{titulo}</span>
    </div>
  );
}
