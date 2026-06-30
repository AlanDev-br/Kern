"use client";

import type { Grupo } from "@/lib/musculacao";

// Componente de mapa de calor corporal para indicar quais músculos foram trabalhados
// no dia selecionado. Usa design de HUD biométrico simplificado com pulsação cyan/azul.

export interface CorpoHeatmapProps {
  workedMuscles: Set<Grupo> | Grupo[];
}

const NEUTRO_FILL = "rgba(255, 255, 255, 0.03)";
const NEUTRO_STROKE = "rgba(255, 255, 255, 0.06)";
const ACTIVE_COLOR = "#0ea5e9"; // Sky blue / cyan

export function CorpoHeatmap({ workedMuscles }: CorpoHeatmapProps) {
  const activeSet = workedMuscles instanceof Set ? workedMuscles : new Set(workedMuscles);

  const propsMsc = (g: Grupo) => {
    const active = activeSet.has(g);
    if (active) {
      return {
        fill: "rgba(14, 165, 233, 0.25)",
        stroke: ACTIVE_COLOR,
        strokeWidth: "1",
        className: "muscle-heat transition-all duration-300",
        style: { "--heat-color": ACTIVE_COLOR } as React.CSSProperties,
      };
    } else {
      return {
        fill: NEUTRO_FILL,
        stroke: NEUTRO_STROKE,
        strokeWidth: "0.5",
        className: "transition-all duration-300",
      };
    }
  };

  const silhuetaCorpo = (
    <path
      d="M50,4 C57,4 61,10 61,16 C61,22 57,26 53,27 L53,30 C61,31 69,35 73,43 C76,49 76,56 78,64 C80,72 82,82 82,90 C82,94 79,97 75,96 C72,95 72,92 72,87 C71,78 70,68 68,61 C67,58 64,52 64,52 L64,74 C64,78 61,84 60,88 C58,95 56,108 56,128 C56,140 58,154 58,168 C58,173 53,178 48,178 C43,178 38,173 38,168 C38,154 40,140 40,128 C40,108 38,95 36,88 C35,84 32,78 32,74 L32,52 C32,52 29,58 28,61 C26,68 25,78 24,87 C24,92 24,95 21,96 C17,97 14,94 14,90 C14,82 16,72 18,64 C20,56 20,49 23,43 C27,35 35,31 43,30 L43,27 C39,26 35,22 35,16 C35,10 39,4 47,4 Z"
      fill="rgba(255, 255, 255, 0.01)"
      stroke="rgba(255, 255, 255, 0.03)"
      strokeWidth="0.5"
    />
  );

  const hudGrid = (
    <>
      <circle cx="50" cy="90" r="85" fill="none" stroke="rgba(255, 255, 255, 0.01)" strokeWidth="0.5" strokeDasharray="1 4" />
      <line x1="50" y1="5" x2="50" y2="175" stroke="rgba(255, 255, 255, 0.01)" strokeWidth="0.5" strokeDasharray="2 4" />
      <line x1="5" y1="90" x2="95" y2="90" stroke="rgba(255, 255, 255, 0.01)" strokeWidth="0.5" strokeDasharray="2 4" />
    </>
  );

  return (
    <div className="flex items-start justify-center gap-8 py-1">
      <style>{`
        @keyframes pulse-heat {
          0% {
            fill-opacity: 0.2;
            filter: drop-shadow(0 0 1px var(--heat-color));
          }
          50% {
            fill-opacity: 0.55;
            filter: drop-shadow(0 0 6px var(--heat-color));
          }
          100% {
            fill-opacity: 0.2;
            filter: drop-shadow(0 0 1px var(--heat-color));
          }
        }
        .muscle-heat {
          animation: pulse-heat 2s infinite ease-in-out;
        }
      `}</style>

      {/* FRENTE */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 180" className="w-full max-w-[130px]" role="img" aria-label="Heatmap Frontal">
          {hudGrid}
          {silhuetaCorpo}
          <circle cx="50" cy="15" r="9" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M46,23 C46,26 54,26 54,23 L53,28 H47 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M42,28 C39,29 35,32 32,38 C29,43 30,49 33,52 C35,46 39,40 43,36 Z" {...propsMsc("Ombros")} />
          <path d="M58,28 C61,29 65,32 68,38 C71,43 70,49 67,52 C65,46 61,40 57,36 Z" {...propsMsc("Ombros")} />
          <path d="M49,30 H43 C39,32 37,40 36,46 C41,47 45,43 49,41 Z" {...propsMsc("Peito")} />
          <path d="M51,30 H57 C61,32 63,40 64,46 C59,47 55,43 51,41 Z" {...propsMsc("Peito")} />
          <path d="M31,48 C28,52 26,59 26,66 C28,68 31,67 32,65 C34,59 35,53 33,49 Z" {...propsMsc("Bíceps")} />
          <path d="M69,48 C72,52 74,59 74,66 C72,68 69,67 68,65 C66,59 65,53 67,49 Z" {...propsMsc("Bíceps")} />
          <path d="M25,66 C23,71 21,79 21,87 C23,89 25,88 26,85 C28,79 29,72 28,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M75,66 C77,71 79,79 79,87 C77,89 75,88 74,85 C72,79 71,72 72,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M43,41 C42,50 41,63 40,74 C47,76 53,76 60,74 C59,50 58,41 57,41 Z" {...propsMsc("Core")} />
          <path d="M40,74 C39,78 39,81 41,83 H59 C61,81 61,78 60,74 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M40,84 C36,98 33,115 33,130 C37,132 42,131 44,127 C45,114 46,98 45,84 Z" {...propsMsc("Quadríceps")} />
          <path d="M60,84 C64,98 67,115 67,130 C63,132 58,131 56,127 C55,114 54,98 55,84 Z" {...propsMsc("Quadríceps")} />
          <ellipse cx="36" cy="133" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <ellipse cx="64" cy="133" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M34,136 C33,147 32,159 32,170 C35,171 38,170 39,167 C40,157 41,146 42,136 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M66,136 C67,147 68,159 68,170 C65,171 62,170 61,167 C60,157 59,146 58,136 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
        </svg>
        <span className="mt-1 text-[9px] uppercase tracking-wider text-muted font-semibold">Frente</span>
      </div>

      {/* COSTAS */}
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 100 180" className="w-full max-w-[130px]" role="img" aria-label="Heatmap Traseiro">
          {hudGrid}
          {silhuetaCorpo}
          <circle cx="50" cy="15" r="9" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M46,23 C46,26 54,26 54,23 L53,28 H47 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M42,28 C39,29 35,32 32,38 C29,43 30,49 33,52 C35,46 39,40 43,36 Z" {...propsMsc("Ombros")} />
          <path d="M58,28 C61,29 65,32 68,38 C71,43 70,49 67,52 C65,46 61,40 57,36 Z" {...propsMsc("Ombros")} />
          <path d="M43,30 H57 L63,45 C57,48 43,48 37,45 Z M37,45 C36,53 37,63 41,74 C47,75 53,75 59,74 C63,63 64,53 63,45 Z" {...propsMsc("Costas")} />
          <path d="M31,48 C28,52 26,59 26,66 C28,68 31,67 32,65 C34,59 35,53 33,49 Z" {...propsMsc("Tríceps")} />
          <path d="M69,48 C72,52 74,59 74,66 C72,68 69,67 68,65 C66,59 65,53 67,49 Z" {...propsMsc("Tríceps")} />
          <path d="M25,66 C23,71 21,79 21,87 C23,89 25,88 26,85 C28,79 29,72 28,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M75,66 C77,71 79,79 79,87 C77,89 75,88 74,85 C72,79 71,72 72,67 Z" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M41,74 C38,78 39,87 46,89 C53,89 55,83 55,74 Z" {...propsMsc("Glúteos")} />
          <path d="M59,74 C62,78 61,87 54,89 C47,89 45,83 45,74 Z" {...propsMsc("Glúteos")} />
          <path d="M40,90 C36,104 33,122 33,138 C37,140 42,139 44,135 C45,122 46,104 45,90 Z" {...propsMsc("Posteriores")} />
          <path d="M60,90 C64,104 67,122 67,138 C63,140 58,139 56,135 C55,122 54,104 55,90 Z" {...propsMsc("Posteriores")} />
          <ellipse cx="36" cy="141" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <ellipse cx="64" cy="141" rx="3.5" ry="3" fill={NEUTRO_FILL} stroke={NEUTRO_STROKE} strokeWidth="0.5" />
          <path d="M34,144 C32,154 31,166 32,174 C35,175 38,174 39,171 C40,166 41,154 42,144 Z" {...propsMsc("Panturrilha")} />
          <path d="M66,144 C68,154 69,166 68,174 C65,175 62,174 61,171 C60,166 59,154 58,144 Z" {...propsMsc("Panturrilha")} />
        </svg>
        <span className="mt-1 text-[9px] uppercase tracking-wider text-muted font-semibold">Costas</span>
      </div>
    </div>
  );
}
