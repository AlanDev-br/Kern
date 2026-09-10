import { PLANO_FEMININO_4X, PLANO_MASCULINO_4X } from "./plano-alan";
import { PLANO_KELLY } from "./plano-kelly";
import type { Rotina } from "./db";

// ─────────────────────────────────────────────────────────────
// Perfil de build
// ─────────────────────────────────────────────────────────────
// O Kern é local-first e de dono único: uma instalação, uma vida. Quando duas
// pessoas usam o mesmo app, a separação não pode depender de um seletor em
// tempo de execução — bastaria um bug de estado para as duas vidas se
// misturarem num banco só, e não há como desfazer isso.
//
// A separação acontece então na compilação. `NEXT_PUBLIC_KERN_PERFIL` escolhe
// qual perfil vai para dentro do bundle, e cada build sai com o plano, o tema e
// os recursos daquela pessoa. O que não é do perfil simplesmente não existe no
// arquivo entregue: o histórico de treino de um não é embutido no app do outro,
// e o avatar de um não vira o padrão do outro.

export type PerfilId = "alan" | "kelly";

export interface Perfil {
  id: PerfilId;
  /** Nome mostrado no cabeçalho do perfil, dentro de Configurações. */
  usuario: string;
  /** Iniciais do card de treino. Explícitas porque não se deduzem do usuário. */
  iniciais: string;
  /** Tema aplicado na primeira abertura. Nasce desbloqueado, custe o que custar. */
  temaPadrao: string;
  /** Rotinas instaladas na primeira abertura (idempotente, por id). */
  rotinas: Rotina[];
  /**
   * Embutir `public/treino-seed.json` no primeiro carregamento. É o histórico
   * real de quem gerou o arquivo — só faz sentido para essa pessoa.
   */
  semearHistorico: boolean;
  /**
   * GLB usado enquanto a pessoa não sobe o dela. `null` significa que o app
   * abre sem avatar nenhum e convida a criar o próprio, que é o certo quando o
   * único modelo embutido seria o de outra pessoa.
   */
  avatarPadraoUrl: string | null;
  /**
   * Sincronia celular → desktop. Só existe onde há um Kern de desktop do outro
   * lado; sem isso a seção seria um botão que não leva a lugar nenhum.
   */
  sincroniaDesktop: boolean;
}

const PERFIS: Record<PerfilId, Perfil> = {
  alan: {
    id: "alan",
    usuario: "alannicholas94",
    iniciais: "AN",
    temaPadrao: "esmeralda",
    rotinas: [...PLANO_FEMININO_4X, ...PLANO_MASCULINO_4X],
    semearHistorico: true,
    avatarPadraoUrl: "/avatar/base.glb",
    sincroniaDesktop: true,
  },
  kelly: {
    id: "kelly",
    usuario: "kellyporto",
    iniciais: "KP",
    temaPadrao: "rubi",
    rotinas: PLANO_KELLY,
    semearHistorico: false,
    // Sem GLB embutido de propósito: o avatar é dela, e ela cria o dela.
    avatarPadraoUrl: null,
    // iPhone: o app dela é PWA na tela de início, e não há Kern de desktop
    // pareado do outro lado.
    sincroniaDesktop: false,
  },
};

function escolhido(): PerfilId {
  const bruto = process.env.NEXT_PUBLIC_KERN_PERFIL;
  return bruto === "kelly" ? "kelly" : "alan";
}

export const PERFIL: Perfil = PERFIS[escolhido()];
