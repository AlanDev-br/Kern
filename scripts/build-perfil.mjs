// Build de um perfil específico do Kern.
//
// `next build` com `output: export` sempre escreve em `out/`, e o nome é fixo.
// Como cada perfil precisa do seu próprio pacote publicável, o build acontece
// normalmente e a pasta é renomeada logo depois — é o passo que permite ter
// `out/` (Alan) e `out-kelly/` (Kelly) lado a lado sem um sobrescrever o outro.
//
// O segundo trabalho daqui é apagar do pacote o que pertence a outra pessoa. O
// `public/` inteiro é copiado para o export, então o histórico de treino e o
// avatar embutido chegariam ao build de quem não é dono deles mesmo sem nenhum
// código apontando para os arquivos. Deixar de fora do bundle não basta:
// enquanto o arquivo estiver na pasta publicada, ele está publicado.
//
// Uso: node scripts/build-perfil.mjs <alan|kelly>

import { spawnSync } from "node:child_process";
import { existsSync, rmSync, renameSync } from "node:fs";
import { join } from "node:path";

const PERFIS = {
  alan: { saida: "out", remover: [] },
  kelly: {
    saida: "out-kelly",
    remover: ["avatar/base.glb", "treino-seed.json"],
  },
};

const perfil = process.argv[2];
const cfg = PERFIS[perfil];
if (!cfg) {
  console.error(`Perfil desconhecido: ${perfil}. Use: ${Object.keys(PERFIS).join(" | ")}`);
  process.exit(1);
}

// A pasta de destino sai da frente antes do build. Se o build falhar no meio,
// é melhor não existir pacote nenhum do que sobrar o pacote da rodada passada
// parecendo o resultado desta.
if (cfg.saida !== "out" && existsSync(cfg.saida)) rmSync(cfg.saida, { recursive: true, force: true });
if (existsSync("out")) rmSync("out", { recursive: true, force: true });

const build = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_KERN_PERFIL: perfil },
});
if (build.status !== 0) process.exit(build.status ?? 1);

if (cfg.saida !== "out") renameSync("out", cfg.saida);

for (const rel of cfg.remover) {
  const alvo = join(cfg.saida, rel);
  if (existsSync(alvo)) {
    rmSync(alvo, { recursive: true, force: true });
    console.log(`removido do pacote: ${rel}`);
  }
}

console.log(`\nPerfil "${perfil}" construído em ${cfg.saida}/`);

if (cfg.saida !== "out") {
  // `out/` é o que o Electron carrega e o que o Capacitor sincroniza. Este build
  // consumiu a pasta, então quem for abrir o desktop precisa refazer o dele.
  console.log("Aviso: `out/` foi consumida aqui. Rode `npm run build` antes de abrir o desktop.");
}
