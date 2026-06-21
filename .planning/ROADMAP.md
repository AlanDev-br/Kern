# ROADMAP — Reconstrução 90

Legenda: ✅ feito · 🔜 próximo · 💡 proposto

- ✅ **Fase 0 — Scaffold:** Next.js static export + Tailwind + Dexie + Zustand + Capacitor + estrutura.
- ✅ **Fase 1 — Dados:** modelo Dexie (`src/lib/db.ts`) + seed do plano (`src/lib/plan-data.ts`).
- ✅ **Fase 2 — Hoje + motor de XP:** check-in diário, cálculo de XP, fechamento do dia (`src/app/page.tsx`, `src/lib/gamification.ts`).
- ✅ **Fase 3 — Gamificação:** streaks, níveis, conquistas, temas desbloqueáveis, frases em marcos.
- ✅ **Fase 4 — Progresso + Revisão semanal:** heatmap 90 dias, gráfico XP, formulário de domingo.
- ✅ **Fase 5 — Notificações + Config:** agendamento nativo (`src/lib/notifications.ts`) + tela de horários.
- ✅ **Fase 6 — Backup + Finanças:** exportar/importar/compartilhar + módulo de dívidas.
- ✅ **Fase 7 — Polish awwwards:** Framer Motion, confete, háptico, manifest PWA, ícone.
- 🔜 **Fase 8 — Entrega:** build APK (Android Studio), instalar no celular, deploy web na Vercel.
- ✅ **Fase 9 — Tempo de tela (Android UsageStats):** plugin nativo Java `ScreenTimePlugin`
  lê uso de Instagram/WhatsApp/etc. e compara com a janela de 40 min. Permissão
  PACKAGE_USAGE_STATS (manual). Card na tela Hoje. Só no APK.
- ✅ **Fase 10 — Huawei Band via Health Connect:** plugin `@devmaxime/capacitor-health-connect`
  lê sono e exercício do Health Connect (alimentado por Huawei Health → Health Sync).
  Auto-marca os inegociáveis "acordar" (fim do sono) e "treino" (sessão de exercício).
  Permissões health.READ_SLEEP/READ_EXERCISE + rationale activity no manifesto. Só no APK.

## Estado atual
Build web passa (`npm run build`), export estático em `/out`, plataforma Android
adicionada em `/android` com 5 plugins. Falta: gerar/instalar APK e validar
notificação disparando com app fechado (critério-chave da Fase 8).
