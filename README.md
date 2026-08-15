<div align="center">

# Kern

**App mobile de hábitos com avatar 3D procedural, coach de IA e arquitetura local-first — empacotado como Android nativo.**

Three.js/R3F a 60 FPS em celulares intermediários · Groq · Dexie/IndexedDB · Capacitor + plugin Java próprio.

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?logo=capacitor&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-orange)
![Groq](https://img.shields.io/badge/IA-Groq-F55036)

🌐 [Demo web](https://kern-sable.vercel.app) · 📖 [Estudo de caso](https://portifolio-alan-chi.vercel.app/work/kern)

</div>

---

## 🎯 Sobre

O **Kern** nasceu de um plano pessoal de 90 dias e virou um app completo de acompanhamento de hábitos com uma pegada de RPG. A ideia central: transformar **prova acumulada** (treinos, leitura, disciplina, sono) em **poder visível** — um **avatar 3D que evolui** com seus dados, atributos que sobem e um mentor de IA que orienta o dia.

É **local-first**: tudo roda offline no dispositivo (IndexedDB), sem backend e sem coletar dados do usuário.

> Projeto pessoal, em uso real e evolução contínua.

## ✨ Funcionalidades

### 📅 Rotina e hábitos
- Checklist diário **totalmente editável** (criar, editar, reordenar tarefas).
- Aba **Agenda** com o "tick" das tarefas e template do dia/semana.
- **Streak** e sistema de **XP/níveis** sobre os inegociáveis do dia.
- Notificações nativas em horário fixo (Android).

### 🏋️ Treino
- Registrador de treino completo (séries, cargas, recordes, cronômetro de descanso).
- **Estatísticas**: distribuição muscular **normalizada pelo volume ótimo**, heatmap corporal, séries por músculo e classificação de força (Bronze → Diamante, por múltiplos do peso corporal).
- **Coach de treino**: aponta os músculos em déficit de volume na semana.
- **Card de pós-treino** compartilhável como imagem (resumo, recordes e músculos trabalhados).
- Substituição de exercício e seletor próprio durante o treino.

### ⚖️ Balança e composição corporal
- Lê a **Mi Body Composition Scale 2 direto por Bluetooth**, sem parear e sem o app da fabricante — a balança transmite peso e impedância em broadcast, e o app escuta.
- Gordura, massa magra e muscular, água, proteína, gordura visceral, gasto basal e massa óssea, calculados a partir da impedância medida.
- O banco guarda o **dado bruto**: se a fórmula melhorar, o histórico inteiro é recalculado.
- Média móvel de 7 dias e tendência em kg/semana — peso de um dia é hidratação, não gordura.

### 🧬 Avatar evolutivo
- Avatar 3D que **evolui com o rank**: um **motor procedural** engrossa peito, ombros, braços e coxas escalando os ossos do esqueleto — com compensação para não deformar cabeça, mãos e pés.
- Aura, partículas e escala que intensificam conforme a consistência.

### 📊 Progresso (RPG) + Mente
- Painel de **6 atributos** (Força, Agilidade, Vitalidade, Inteligência, Foco, Espírito) derivados dos dados reais, em radar.
- Módulo **Mente**: auto-avaliação das **múltiplas inteligências** (Gardner + emocional) e **mini-testes cognitivos** (tempo de reação, memória de trabalho, atenção/Stroop).

### 🧭 Coach de IA
- Mentor conversacional (via **Groq**) que age sobre os **dados reais** do usuário.
- **Base de conhecimento embutida no código** — treino natural, neurociência da transformação, ciência dos hábitos, anti-dopamina, sono e estoicismo — guiando as respostas.

### 📚 Outros
- Biblioteca com **repetição espaçada** (Leitner) de conceitos para internalizar.
- Acompanhamento de finanças/dívidas, revisão semanal e conquistas.
- Integração com pulseira via **Health Connect**.

## 🛠️ Stack

| Camada | Tecnologias |
|---|---|
| Front-end | Next.js 16 (export estático), React, TypeScript, Tailwind v4 |
| Estado / dados | Zustand · Dexie (IndexedDB, local-first) |
| Visual | Framer Motion · Recharts · Three.js / React Three Fiber (avatar) |
| Mobile | Capacitor (Android) + **plugin nativo próprio** (tempo de tela) |
| IA | Groq (API compatível com OpenAI) |

## 🧩 Destaques de arquitetura

- **Local-first de verdade:** sem backend; todo o estado vive no IndexedDB com migrações versionadas (Dexie).
- **Plugin nativo Android próprio** em Java para tempo de tela / limitador de apps.
- **Motor 3D procedural:** manipulação de esqueleto (bone scaling) para gerar variações corporais a partir de um único modelo — **60 FPS em celulares intermediários**, com DPR dinâmico via `<PerformanceMonitor>` quando o hardware aperta.
- **IA com conhecimento embutido:** a "inteligência de domínio" fica no código, não na nuvem — o modelo só personaliza com os dados do usuário.
- **Geração de imagem no cliente** (html-to-image) para o card compartilhável.
- **Privacidade:** nenhum dado sai do dispositivo; a chave de IA fica local (`.env.local`).

## 🚀 Rodando o projeto

```bash
# desenvolvimento
npm install
npm run dev            # http://localhost:3000

# build de produção (estático)
npm run build          # gera a pasta out/

# Android
npm run cap:sync       # build + sincroniza o Capacitor
npm run android:apk    # gera o APK debug
```

### Coach de IA (opcional)
Crie um `.env.local` com uma chave gratuita do [Groq](https://console.groq.com/keys):

```
NEXT_PUBLIC_GROQ_API_KEY=sua_chave
NEXT_PUBLIC_GROQ_MODELO=llama-3.3-70b-versatile
```

## 📁 Estrutura

```
src/
  app/            rotas (Hoje, Agenda, Treino, Progresso, Mente, Coach, ...)
  components/     UI (avatar 3D, gráficos, cards, modais)
  lib/            domínio: db (Dexie), gamificação, força, IA, atributos, mente
android/          projeto Capacitor + plugin nativo
```

## 🗺️ Status

Em uso pessoal e evolução contínua. Próximos focos: refino do coach de IA, calibração dos atributos e versão iOS.

## 📄 Licença

[GPL-3.0-or-later](LICENSE).

O módulo de composição corporal (`src/lib/composicao-xiaomi.ts`) é portado do
[openScale](https://github.com/oliexdev/openScale), que por sua vez deriva do
[bodymiscale](https://github.com/dckiller51/bodymiscale) — ambos GPL-3.0. É de lá que
vem a massa magra calibrada para o hardware da balança, e com ela os números que
conversam com o aparelho em vez de divergir dele.

---

<div align="center">
<sub>Feito por <a href="https://github.com/AlanDev-br">Alan Nicholas</a></sub>
</div>
