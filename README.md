<div align="center">

# Kern

**Sistema operacional pessoal de reconstrução em 90 dias — corpo, mente e hábitos em um só app.**

Local-first · gamificado · com coach de IA · empacotado como app Android nativo.

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?logo=capacitor&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?logo=threedotjs&logoColor=white)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-orange)
![Groq](https://img.shields.io/badge/IA-Groq-F55036)

</div>

---

## 🎯 Sobre

O **Kern** nasceu de um plano pessoal de 90 dias e virou um app completo de acompanhamento de hábitos com uma pegada de RPG. A ideia central: transformar **prova acumulada** (treinos, leitura, disciplina, sono) em **poder visível** — um avatar que evolui, atributos que sobem e um mentor que orienta o dia.

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
- **Motor 3D procedural:** manipulação de esqueleto (bone scaling) para gerar variações corporais a partir de um único modelo.
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

---

<div align="center">
<sub>Feito por <a href="https://github.com/AlanDev-br">Alan Nicholas</a></sub>
</div>
