"use client";

import { motion } from "framer-motion";
import type { TaskDef } from "@/lib/types";

export function TaskItem({
  task,
  done,
  onToggle,
  destaque,
}: {
  task: TaskDef;
  done: boolean;
  onToggle: () => void;
  destaque?: boolean;
}) {
  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
        done
          ? "border-transparent bg-accent-soft ring-accent-soft"
          : "border-line bg-card hover:border-muted/40"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-transform ${
          done ? "scale-105" : ""
        } ${destaque && !done ? "bg-bg" : "bg-bg/60"}`}
      >
        {task.icone}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold leading-snug ${
            done ? "text-fg" : "text-fg"
          }`}
        >
          {task.titulo}
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          {task.horario ? `${task.horario} · ` : ""}+{task.xp} XP
        </span>
      </span>

      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          done
            ? "border-accent bg-accent text-bg"
            : "border-line text-transparent"
        }`}
      >
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          initial={false}
          animate={{ scale: done ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
        >
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </span>
    </motion.button>
  );
}
