"use client";

// ─────────────────────────────────────────────────────────────
// Identidade do aparelho e dos registros
// ─────────────────────────────────────────────────────────────
// Pré-requisito da sincronia entre celular e desktop, e por isso vem antes do
// transporte: sem identidade estável, sincronizar CORROMPE em vez de juntar.
//
// O problema concreto: quatro tabelas (`avaliacoesMente`, `testesCognitivos`,
// `conversasCoach`, `meditacoes`) usam `++id` auto-incremental. Cada aparelho
// conta a partir do 1 por conta própria, então a meditação nº 5 do celular e a
// nº 5 do desktop são registros DIFERENTES com a mesma chave. Qualquer fusão
// ingênua ou apaga uma ou duplica as duas, e o usuário não tem como perceber.
//
// A saída não é trocar a chave primária. No Dexie, mudar a chave primária
// destrói o object store, e migrar quatro tabelas assim é risco que não precisa
// existir. Em vez disso, cada registro ganha um `uid` globalmente único ao
// lado: o `++id` continua sendo detalhe local do aparelho, e a sincronia casa
// por `uid`. Nada é destruído, e a migração só preenche um campo novo.

const CHAVE_APARELHO = "kern_aparelho_id";

/**
 * Identificador deste aparelho. Nasce na primeira chamada e não muda mais —
 * é ele que garante que dois aparelhos nunca gerem o mesmo `uid`.
 *
 * Mora no localStorage e não no IndexedDB de propósito: ele precisa existir
 * ANTES de a migração do banco rodar, e a migração é justamente quem vai
 * carimbar os registros antigos.
 */
export function idAparelho(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_APARELHO);
    if (salvo) return salvo;
    const novo = aleatorio(8);
    localStorage.setItem(CHAVE_APARELHO, novo);
    return novo;
  } catch {
    // Sem localStorage (janela privada, contexto restrito) o aparelho fica
    // anônimo por sessão. A sincronia não vai funcionar, mas o app funciona —
    // e é melhor que quebrar na abertura.
    return "efemero-" + aleatorio(8);
  }
}

function aleatorio(n: number): string {
  const alfabeto = "0123456789abcdefghijklmnopqrstuvwxyz";
  // crypto quando existe; Math.random é fallback, não escolha.
  const bytes =
    typeof crypto !== "undefined" && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(n))
      : Array.from({ length: n }, () => Math.floor(Math.random() * 256));
  let s = "";
  for (const b of bytes) s += alfabeto[b % alfabeto.length];
  return s;
}

/**
 * Identificador global de um registro: aparelho + instante + acaso.
 *
 * O instante em base 36 mantém a ordem cronológica na ordenação por texto, o
 * que é útil para depurar e para desempate. O sufixo aleatório cobre dois
 * registros criados no mesmo milissegundo.
 */
export function novoUid(): string {
  return `${idAparelho()}-${Date.now().toString(36)}-${aleatorio(4)}`;
}

/**
 * `uid` determinístico para registro que já existe sem um. Duas execuções da
 * migração no mesmo aparelho produzem o mesmo valor, então rodar de novo não
 * cria duplicata — e é por isso que ele não usa `Date.now()` nem acaso.
 */
export function uidLegado(tabela: string, idLocal: number | string): string {
  return `${idAparelho()}-legado-${tabela}-${idLocal}`;
}
