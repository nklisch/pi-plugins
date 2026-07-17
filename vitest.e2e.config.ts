import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.e2e.test.ts"],
    globalSetup: ["test/e2e/global-setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    isolate: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
});
