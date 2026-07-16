import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@grinta/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
      "@grinta/persistence": fileURLToPath(
        new URL("./packages/persistence/src/index.ts", import.meta.url),
      ),
      "@grinta/shared": fileURLToPath(
        new URL("./packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/simulator/**/*.test.ts",
      "apps/api/**/*.test.ts",
      "apps/mobile/**/*.test.ts",
      "scripts/roadmap/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
