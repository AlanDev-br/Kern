import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // A casca de desktop roda no processo principal do Electron, que é
    // obrigatoriamente CommonJS: `require` ali não é escolha de estilo, é o
    // formato que o runtime aceita. Aplicar a ela as regras de um app Next
    // acusaria erro em código correto.
    "electron/**",
    "dist-desktop/**",
  ]),
]);

export default eslintConfig;
