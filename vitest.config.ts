import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const alias = {
  "@grinta/core": fileURLToPath(
    new URL("./packages/core/src/index.ts", import.meta.url),
  ),
  "@grinta/persistence": fileURLToPath(
    new URL("./packages/persistence/src/index.ts", import.meta.url),
  ),
  "@grinta/shared": fileURLToPath(
    new URL("./packages/shared/src/index.ts", import.meta.url),
  ),
};

/** Testes que falam com o Postgres de verdade (R-173). */
const POSTGRES_TESTS = "packages/persistence/tests/{prisma-*,identity-commands}.test.ts";

const UNIT_TESTS = [
  "packages/**/*.test.ts",
  "apps/api/**/*.test.ts",
  "apps/mobile/**/*.test.ts",
  "apps/admin/**/*.test.ts",
];

export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      reporter: ["text", "json", "html"],
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: UNIT_TESTS,
          exclude: ["**/node_modules/**", "**/dist/**", POSTGRES_TESTS],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "postgres",
          include: [POSTGRES_TESTS],
          /**
           * Um banco só, e cada arquivo dá TRUNCATE nas tabelas que usa. Em
           * paralelo, o TRUNCATE de um corre contra o INSERT do outro — e a
           * suíte reprova um número diferente de testes a cada rodada. Gate que
           * oscila não é gate.
           *
           * `singleFork` (e não `fileParallelism`, que só vale na raiz) põe
           * estes arquivos num processo só, em série. Custa segundos e não
           * afeta o projeto `unit`, que segue em paralelo.
           */
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
});
