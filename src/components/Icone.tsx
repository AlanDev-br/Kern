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
  | "chevron" | "check" | "x" | "mais" | "config"
  | "amanhecer"  | "lua"  | "caminhada"  | "impulso"  | "estudo"  | "semCelular"  | "refeicao"  | "sino"  | "grafico"  | "tendencia"  | "dinheiro"  | "numeros"  | "escrita"  | "bussola"  | "corpoLivre"  | "musica"  | "pessoas"  | "paleta"  | "musculo"  | "perna"  | "pulmao"  | "postura"  | "relogioPulso"  | "lixeira"  | "trocar"  | "editar"  | "local"  | "enviar"  | "play"  | "camera"  | "menos"  | "som"  | "mudo"  | "cadeado"  | "medalha"  | "estrela"
  | "base" | "escudo" | "ciclo" | "diamante" | "coroa" | "broto" | "espelho" | "folha";

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

  // Momentos do dia e rotina
  amanhecer: <><path d="M12 4v2M5 8 6.4 9.4M19 8l-1.4 1.4M3 16h18M6 16a6 6 0 0 1 12 0" /><path d="M7 20h10" /></>,
  lua: <><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" /></>,
  caminhada: <><circle cx="13" cy="4.5" r="1.8" /><path d="M12 8.5 9.5 12l2.5 2 1 6" /><path d="M12 14.5 8 21M14.5 9.5 18 12" /></>,
  impulso: <><path d="M12 3c3 2.5 4.5 6 4.5 9.5L12 17l-4.5-4.5C7.5 9 9 5.5 12 3Z" /><path d="M12 10v.01" /><path d="M9 18l-2 3M15 18l2 3" /></>,
  estudo: <><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" /></>,
  semCelular: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M4 20 20 4" /></>,
  refeicao: <><path d="M5 4v5a2.5 2.5 0 0 0 5 0V4M7.5 11.5V20" /><path d="M17 4c-1.5 1-2 3-2 5s.7 2.5 2 2.5V20" /></>,
  sino: <><path d="M12 4a5 5 0 0 0-5 5v3.5L5.5 16h13L17 12.5V9a5 5 0 0 0-5-5Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,

  // Dados e dinheiro
  grafico: <><path d="M4 4v16h16" /><rect x="7.5" y="12" width="3" height="5" /><rect x="13.5" y="8" width="3" height="9" /></>,
  tendencia: <><path d="M4 4v16h16" /><path d="M7 15.5 11 11l3 2.5L19.5 7" /><path d="M19.5 11V7h-4" /></>,
  dinheiro: <><path d="M12 5v14" /><path d="M15.5 8.5C15 7.2 13.7 6.5 12 6.5c-2 0-3.5 1-3.5 2.6 0 3.6 7.5 1.6 7.5 5.4 0 1.7-1.6 2.8-4 2.8-1.9 0-3.3-.8-3.8-2.2" /></>,
  numeros: <><path d="M9 4 7.5 20M16.5 4 15 20" /><path d="M4.5 9h15M4 15h15" /></>,

  // Mente
  escrita: <><path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" /><path d="M14.5 6.5l3 3" /></>,
  bussola: <><circle cx="12" cy="12" r="8.5" /><path d="m15 9-1.8 4.2L9 15l1.8-4.2L15 9Z" /></>,
  corpoLivre: <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 7v5M12 12l-3.5 8M12 12l3.5 8" /><path d="M5 8.5 12 10l7-1.5" /></>,
  musica: <><circle cx="7" cy="17.5" r="2.5" /><circle cx="17" cy="15.5" r="2.5" /><path d="M9.5 17.5V6l10-2v11.5" /><path d="M9.5 9.5 19.5 7.5" /></>,
  pessoas: <><circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9.5" r="2.4" /><path d="M3 19a5.5 5.5 0 0 1 11 0" /><path d="M15 14.5a4.5 4.5 0 0 1 6 4.5" /></>,
  paleta: <><path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8s3.8 8 8.5 8c1.4 0 2.2-.9 2.2-1.9 0-1.6-1.6-1.8-1.6-3.1 0-1 .9-1.7 2-1.7h1.9c2.2 0 4-1.7 4-3.9 0-3-3.6-5.4-8.5-5.4Z" /><path d="M8 10v.01M12 8v.01M16 10.5v.01" /></>,

  // Corpo e treino
  musculo: <><path d="M6.5 5c2 0 3 1.4 3.5 3l1.5 4.5c.4 1.2 1.4 1.8 2.7 1.8h2.3c1.4 0 2.5 1.1 2.5 2.5S17.9 19 16.5 19h-7C6.5 19 4 16.5 4 13V8a3 3 0 0 1 2.5-3Z" /><path d="M10 12.5c1.5-.8 3-.8 4.5 0" /></>,
  perna: <><path d="M9 3.5h5l-.6 6.2c-.1 1 .1 2 .7 2.9l1.6 2.4c.9 1.4.4 3.2-1 4-1.3.8-3 .3-3.8-1L9 15" /><path d="M9.4 9.7 8 20.5" /></>,
  pulmao: <><path d="M12 3v9" /><path d="M12 8c-1.4 0-2.5-.6-3.3-1.4C7.4 5.3 5 6 4.6 8L3.4 14c-.4 2 1 3.9 3 4.2 1.7.2 3.3-.9 3.7-2.6L12 8" /><path d="M12 8c1.4 0 2.5-.6 3.3-1.4C16.6 5.3 19 6 19.4 8l1.2 6c.4 2-1 3.9-3 4.2-1.7.2-3.3-.9-3.7-2.6L12 8" /></>,
  postura: <><circle cx="12" cy="4.5" r="1.9" /><path d="M12 7v7M8.5 9.5h7M10 14l-1 6.5M14 14l1 6.5" /></>,
  relogioPulso: <><rect x="7" y="7" width="10" height="10" rx="2.5" /><path d="M9 7V4.5h6V7M9 17v2.5h6V17" /><path d="M12 10v2.2l1.5 1" /></>,

  // Controles
  lixeira: <><path d="M4.5 6.5h15" /><path d="M9.5 6.5V4.5h5v2" /><path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" /><path d="M10.5 10v6.5M13.5 10v6.5" /></>,
  trocar: <><path d="M4 8.5h13M13.5 5 17 8.5 13.5 12" /><path d="M20 15.5H7M10.5 12 7 15.5 10.5 19" /></>,
  editar: <><path d="M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.5 16.5 4 20Z" /><path d="M14.5 7.5 17 10" /></>,
  local: <><path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.4" /></>,
  enviar: <><path d="M12 20V5" /><path d="M6.5 10.5 12 5l5.5 5.5" /><path d="M5 20h14" /></>,
  play: <><path d="M8 5.5v13l11-6.5-11-6.5Z" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8.5 7 10 4.5h4L15.5 7" /></>,
  menos: <><path d="M5.5 12h13" /></>,
  som: <><path d="M4.5 9.5h3L12 6v12l-4.5-3.5h-3v-5Z" /><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" /></>,
  mudo: <><path d="M4.5 9.5h3L12 6v12l-4.5-3.5h-3v-5Z" /><path d="m16 10 4 4M20 10l-4 4" /></>,

  // Marcas de estado
  cadeado: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><path d="M12 14.5v2" /></>,
  medalha: <><circle cx="12" cy="14.5" r="5" /><path d="m8.5 10-3-6.5M15.5 10l3-6.5" /><path d="M12 12.5v4M10.5 14h3" /></>,
  estrela: <><path d="m12 4 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 4Z" /></>,

  // Marcos do plano e símbolos de rank
  base: <><rect x="3.5" y="13.5" width="17" height="6" rx="1" /><rect x="6" y="7.5" width="12" height="6" rx="1" /><path d="M8.5 13.5v6M14 13.5v6M11 7.5v6" /></>,
  escudo: <><path d="M12 3.5 5 6v6c0 4 3 7.2 7 8.5 4-1.3 7-4.5 7-8.5V6l-7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  ciclo: <><path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L20 9.5" /><path d="M20 5v4.5h-4.5" /><path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4 14.5" /><path d="M4 19v-4.5h4.5" /></>,
  diamante: <><path d="M7 4h10l4 5.5-9 10.5L3 9.5 7 4Z" /><path d="M3 9.5h18M9.5 4 7.5 9.5 12 20M14.5 4l2 5.5L12 20" /></>,
  coroa: <><path d="M4 8.5 6.5 16h11L20 8.5l-4.5 3L12 5.5 8.5 11.5 4 8.5Z" /><path d="M6.5 19h11" /></>,
  broto: <><path d="M12 20v-7" /><path d="M12 13c0-3 2-5 5.5-5.2C17.3 11.3 15 13 12 13Z" /><path d="M12 15.5c0-2.6-1.7-4.3-4.8-4.5.2 3 2.2 4.5 4.8 4.5Z" /></>,
  espelho: <><ellipse cx="12" cy="9.5" rx="6" ry="6.5" /><path d="M12 16v4.5M9 20.5h6" /><path d="M9.5 7.5a3.5 3.5 0 0 1 2.5-2" /></>,
  folha: <><path d="M5 19c0-8 4.5-13 14.5-13.5C19 15 14.5 19.5 5 19Z" /><path d="M5 19c3.5-5 6.5-7.5 10.5-9.5" /></>,
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
