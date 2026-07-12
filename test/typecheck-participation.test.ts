import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  LifecycleStateStore,
  UnverifiedStateMutation,
} from "../src/index.js";

/**
 * Keep this sentinel in a test module so a future config change cannot make
 * Vitest appear green while silently dropping the test-side contract checks.
 */
function assertStoreBoundaryRejectsUnverified(
  store: LifecycleStateStore,
  input: UnverifiedStateMutation,
  signal: AbortSignal,
): void {
  if (false) {
    // @ts-expect-error Structural schema output must not satisfy the store port.
    void store.commit(input, signal);
  }
}

void assertStoreBoundaryRejectsUnverified;

describe("test TypeScript program", () => {
  it("includes this test file and keeps the test root at the repository root", () => {
    const configPath = fileURLToPath(new URL("../tsconfig.test.json", import.meta.url));
    const configDirectory = dirname(configPath);
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      compilerOptions?: { rootDir?: unknown };
      include?: readonly unknown[];
    };
    expect(config.compilerOptions?.rootDir).toBe(".");
    expect(config.include).toContain("test/**/*.ts");
    expect(fileURLToPath(import.meta.url)).toContain(`${configDirectory}/test/`);
  });
});
