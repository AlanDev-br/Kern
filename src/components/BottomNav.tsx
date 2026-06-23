"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Hoje", icon: "◎" },
  { href: "/treino/", label: "Treino", icon: "💪" },
  { href: "/progresso/", label: "Progresso", icon: "▟" },
  { href: "/conquistas/", label: "Troféus", icon: "✦" },
  { href: "/rotina/", label: "Rotina", icon: "☰" },
  { href: "/biblioteca/", label: "Leitura", icon: "📖" },
  { href: "/config/", label: "Ajustes", icon: "⚙" },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass flex items-center justify-around rounded-2xl px-2 py-2 shadow-2xl">
        {ITENS.map((it) => {
          const ativo = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors"
            >
              <span
                className={`text-lg leading-none transition-transform ${
                  ativo ? "scale-110 text-accent" : "text-muted"
                }`}
              >
                {it.icon}
              </span>
              <span
                className={`text-[10px] font-medium ${
                  ativo ? "text-fg" : "text-muted"
                }`}
              >
                {it.label}
              </span>
              {ativo && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
