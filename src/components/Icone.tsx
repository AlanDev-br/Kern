/**
 * Sistema de ícones do Kern.
 *
 * Existe porque a interface usava 149 glifos unicode e emoji em 38 arquivos,
 * contra 26 `<svg>` no projeto inteiro. O problema não era só a contagem: a
 * barra inferior misturava `◎ ☰ ▟ ◫ ✦` — geométricos monocromáticos — com
 * `💪 📖 👤`, que são emoji coloridos desenhados pelo sistema operacional.
 * Mudam de desenho a cada aparelho, não compartilham traço, peso nem grade, e
 * juntos parecem uma barra montada com o que estava à mão.
 *
 * Uma grade só: 24×24, traço 1.75, terminação e junta arredondadas, `currentColor`
 * para herdar a cor de quem chama. Nada de preenchimento — o app é escuro e
 * contorno pesa menos que sólido no meio de texto.
 */

type Nome =
  | "hoje" | "treino" | "progresso" | "dados" | "perfil"
  | "agenda" | "trofeu" | "leitura" | "coach" | "mente"
  | "chama" | "raio" | "alvo" | "coracao" | "corrida" | "meditacao"
  | "seta-direita" | "seta-esquerda" | "seta-cima" | "seta-baixo"
  | "chevron" | "check" | "x" | "mais" | "config";

const TRACOS: Record<Nome, React.ReactNode> = {
  // Navegação
  hoje: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></>,
  treino: <><path d="M4 9v6M20 9v6M7 7v10M17 7v10" /><path d="M7 12h10" /></>,
  progresso: <><path d="M4 20h16" /><path d="M7 20v-5M12 20v-9M17 20v-13" /></>,
  dados: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 4v16M4 12h8" /></>,
  perfil: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,

  // Seções
  agenda: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  trofeu: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3" /><path d="M12 13v4M9 20h6" /></>,
  leitura: <><path d="M12 6.5S10 4.5 4 4.5v13c6 0 8 2 8 2s2-2 8-2v-13c-6 0-8 2-8 2Z" /><path d="M12 6.5v13" /></>,
  coach: <><circle cx="12" cy="12" r="8" /><path d="M9 9.5a3 3 0 1 1 3 3.5v1" /><path d="M12 17.5v.01" /></>,
  mente: <><path d="M12 5a3.5 3.5 0 0 0-3.5 3.5A3 3 0 0 0 7 14v.5a3.5 3.5 0 0 0 5 3.2 3.5 3.5 0 0 0 5-3.2V14a3 3 0 0 0-1.5-5.5A3.5 3.5 0 0 0 12 5Z" /><path d="M12 5v13" /></>,

  // Atributos e estados
  chama: <><path d="M12 3s4 4 4 7a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9.5 9 11 10 11c1.5 0 1-4 2-8Z" /><path d="M7.5 13a6 6 0 0 0 9 5.2A6 6 0 0 1 7.5 13Z" /></>,
  raio: <><path d="M13 3 5 13h6l-1 8 8-10h-6l1-8Z" /></>,
  alvo: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  coracao: <><path d="M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9Z" /></>,
  corrida: <><circle cx="15" cy="5" r="1.8" /><path d="M13 21l1.5-5-3-2.5 1-4.5 3 2.5 3 .5" /><path d="M11.5 9 8 11l-1 4" /></>,
  meditacao: <><circle cx="12" cy="6" r="2" /><path d="M12 9v5" /><path d="M12 14 7 18h10l-5-4Z" /><path d="M7 12l5 2 5-2" /></>,

  // Interface
  "seta-direita": <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  "seta-esquerda": <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
  "seta-cima": <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  "seta-baixo": <><path d="M12 5v14M6 13l6 6 6-6" /></>,
  chevron: <><path d="M9 5l7 7-7 7" /></>,
  check: <><path d="M4 12.5 9.5 18 20 6.5" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  mais: <><path d="M12 5v14M5 12h14" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" /></>,
};

export function Icone({
  nome,
  tamanho = 24,
  className,
}: {
  nome: Nome;
  tamanho?: number;
  className?: string;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {TRACOS[nome]}
    </svg>
  );
}

export type IconeNome = Nome;
