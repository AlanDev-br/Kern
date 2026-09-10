"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type IconeNome } from "./Icone";
import { PERFIL } from "@/lib/perfil";

// Cinco destinos, não oito. A barra anterior dava 42px de largura por item numa
// tela de 390px, e encolheu para 32px quando o rótulo subiu para 13px — oito
// rótulos legíveis não cabem. Nada foi removido do app, só mudou de porta:
// Agenda e Leitura são alcançadas pela Hoje, Troféus pelo Progresso.
const TODOS_ITENS: { href: string; label: string; icone: IconeNome }[] = [
  { href: "/", label: "Hoje", icone: "hoje" },
  { href: "/treino/", label: "Treino", icone: "treino" },
  { href: "/progresso/", label: "Progresso", icone: "progresso" },
  { href: "/dados/", label: "Dados", icone: "dados" },
  { href: "/config/", label: "Perfil", icone: "perfil" },
];

// "Dados" inteira depende do Health Connect, que é do Android. Num perfil sem
// APK ela nunca sai da tela de "só no aplicativo": vira uma porta permanente
// para um cômodo que não existe.
const ITENS = TODOS_ITENS.filter((i) => (i.href === "/dados/" ? PERFIL.temAndroid : true));

/**
 * A mesma navegação em duas formas, escolhidas pela largura e não pelo aparelho.
 *
 * Até 1024px é a barra inferior: o polegar alcança a base da tela, e é onde o
 * dedo já procura. A partir dali ela vira coluna à esquerda, porque barra
 * inferior numa tela de 1920px fica a meio metro do cursor e ainda gasta a
 * altura, que é o recurso escasso em 16:9 — 1080px de altura contra 1920 de
 * largura.
 *
 * Os destinos são os mesmos e na mesma ordem nas duas formas: quem aprendeu a
 * posição no celular não reaprende no computador.
 */
export function Navegacao() {
  const path = usePathname();

  return (
    <>
      {/* Barra inferior — até lg */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="flutuante flex items-stretch justify-around rounded-2xl px-1 py-1">
          {ITENS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={path === it.href ? "page" : undefined}
              // min-h-12 = 48px. O alvo é a área tocável, não o desenho do ícone.
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors"
            >
              <Icone
                nome={it.icone}
                tamanho={20}
                className={path === it.href ? "text-accent" : "text-muted"}
              />
              <span className={`text-xs font-medium ${path === it.href ? "text-fg" : "text-muted"}`}>
                {it.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Coluna lateral — a partir de lg */}
      <nav
        aria-label="Principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-1 border-r border-line bg-surface px-3 py-5 lg:flex"
      >
        <p className="px-3 pb-5 text-2xl font-extrabold tracking-tight text-accent">kern</p>

        {ITENS.map((it) => {
          const ativo = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors ${
                ativo ? "bg-accent-soft text-fg" : "text-muted hover:bg-card hover:text-fg"
              }`}
            >
              <Icone nome={it.icone} tamanho={20} className={ativo ? "text-accent" : undefined} />
              <span className="text-sm font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
