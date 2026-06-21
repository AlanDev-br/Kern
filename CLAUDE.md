@AGENTS.md

# Kern — Regras do projeto

App pessoal de acompanhamento de um plano de 90 dias (check-in diário, gamificação,
notificações nativas, integração com Huawei Band via Health Connect). Local-first.

## Regras inegociáveis (sempre seguir)

- **Commits em português**, claros e objetivos, descrevendo o que mudou e por quê.
- **Nunca** adicionar coautoria de IA, trailers `Co-Authored-By`, "Generated with",
  emojis de robô ou qualquer marca que indique que o código foi produzido por IA.
- **Nunca** deixar na cara que foi feito por IA — em commits, comentários, PRs,
  mensagens ou documentação. O autor é o Alan.
- **Comentários em português**, seguindo boas práticas: explicar o *porquê*, não o
  óbvio; evitar ruído; manter atualizados com o código.
- **Seguir sempre o protocolo GSD** (get-shit-done): planejar antes de executar,
  fases registradas em `.planning/`, commits atômicos por unidade de trabalho.

## Stack

Next.js 16 (output: 'export' estático) · TypeScript · Tailwind v4 · Zustand ·
Dexie (IndexedDB, local-first) · Framer Motion · Recharts · Capacitor (Android) com
plugins local-notifications / share / filesystem / haptics / preferences /
health-connect, e plugin nativo próprio `ScreenTimePlugin` (tempo de tela).

## Regras de deploy

### Web (Vercel)
- Build de produção: `npm run build` → gera a pasta `out/` (estático puro).
- A versão web é apenas PWA; recursos nativos (notificação em horário fixo,
  tempo de tela, Health Connect) só funcionam no APK Android.
- Antes de publicar: `npm run build` deve passar sem erros de TypeScript/lint.
- Deploy na Vercel apontando para este repositório; framework Next.js, sem variáveis
  de ambiente (app é local-first, sem backend).

### Android (APK)
- Sincronizar antes de buildar: `npm run cap:sync` (faz `next build` + `cap sync android`).
- Abrir no Android Studio: `npm run android:open`.
- Gerar APK debug: `npm run android:apk` (saída em
  `android/app/build/outputs/apk/debug/app-debug.apk`).
- `appId`: `com.alan.kern`.
- Pasta `android/` é versionada (contém o plugin nativo `ScreenTimePlugin.java` e
  ajustes de manifesto). Artefatos de build são ignorados pelo `.gitignore` do Capacitor.
- Critério de aceite no aparelho: notificação dispara no horário com o app fechado.

### Fluxo de release
1. `npm run build` passa.
2. Commit atômico em português descrevendo a mudança.
3. `npm run cap:sync` e validar no aparelho quando a mudança for nativa.
4. Push para `main`; Vercel publica a web automaticamente.
