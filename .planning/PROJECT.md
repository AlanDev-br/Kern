# PROJECT — Kern

## Visão
App PWA/Android pessoal (**Kern**) que transforma o "Plano de 90 Dias do Alan" em um
sistema de check-in diário com notificações nativas, gamificação e gatilhos de motivação.
O nome remete a *cerne/núcleo* — o valor construído para dentro.
Objetivo central do plano: **construir valor para dentro através de prova acumulada
de promessa cumprida.**

## Usuário
Alan — único usuário. EAD, em busca de vaga, foco em saúde física/mental,
independência emocional, desintoxicação de redes e finanças em contenção.

## Princípios de produto
- **Local-first:** todos os dados no aparelho (IndexedDB). Sem login, sem servidor, privado.
- **Notificação confiável** em horário fixo (AlarmManager nativo via Capacitor).
- **Motivação por evidência:** XP, streak, conquistas, temas desbloqueáveis, frases do diagnóstico.
- **Design awwwards:** dark premium, glass, micro-animações, confete + háptico.

## Stack
Next.js 16 (static export) · TypeScript · Tailwind v4 · Zustand · Dexie (IndexedDB) ·
Framer Motion · Recharts · canvas-confetti · Capacitor (Android) +
plugins local-notifications / share / filesystem / haptics / preferences.

## Decisões fechadas
- Dados só no celular; deploy web na Vercel + APK Android (mesmo código).
- Sem Kotlin no app (Capacitor empacota o web). Exceção possível: plugin nativo
  pequeno para tempo de tela (ver ROADMAP Fase 9).
- Recompensas: conquistas + temas + frases do diagnóstico (sem prêmios da vida real).

## Como rodar
- Web/dev: `npm run dev`
- Build estático: `npm run build` (gera /out)
- Sync Android: `npm run cap:sync`
- Abrir no Android Studio: `npm run android:open`
- Gerar APK debug: `npm run android:apk`
