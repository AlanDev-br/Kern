"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Cinco destinos, não oito. A barra anterior dava 42px de largura por item numa
// tela de 390px, e encolheu para 32px quando o rótulo subiu para 13px — oito
// rótulos legíveis não cabem. Nada foi removido do app, só mudou de porta:
// Agenda e Leitura são alcançadas pela Hoje, Troféus pelo Progresso.
const ITENS = [
  { href: "/", label: "Hoje", icon: "◎" },
  { href: "/treino/", label: "Treino", icon: "💪" },
  { href: "/progresso/", label: "Progresso", icon: "▟" },
  { href: "/dados/", label: "Dados", icon: "◫" },
  { href: "/config/", label: "Perfil", icon: "👤" },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flutuante flex items-stretch justify-around rounded-2xl px-1 py-1">
        {ITENS.map((it) => {
          const ativo = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={ativo ? "page" : undefined}
              // min-h-12 = 48px. O alvo é a área tocável, não o desenho do ícone.
              className="relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors"
            >
              <span
                className={`text-lg leading-none ${ativo ? "text-accent" : "text-muted"}`}
                aria-hidden="true"
              >
                {it.icon}
              </span>
              <span className={`text-xs font-medium ${ativo ? "text-fg" : "text-muted"}`}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
