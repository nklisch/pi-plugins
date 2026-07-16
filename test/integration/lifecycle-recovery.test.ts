import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createNodeRecoveryAdapters } from "../../src/infrastructure/recovery/create-node-recovery-adapters.js";

describe("node lifecycle recovery composition", () => {
  it("composes isolated per-scope journals and private retention/lease adapters", async () => {
    const root = await mkdtemp(join(process.cwd(), ".test-lifecycle-recovery-"));
    try {
      const adapters = await createNodeRecoveryAdapters({ hostRoot: root, verifyLocalFilesystem: async () => {} });
      expect(adapters.transitions({ kind: "user" })).toBe(adapters.transitions({ kind: "user" }));
      expect(adapters.transitions({ kind: "user" })).not.toBe(adapters.transitions({ kind: "project", projectKey: `project-v1:sha256:${"a".repeat(64)}` as never }));
      expect((await adapters.artifacts.scan(new AbortController().signal)).complete).toBe(true);
      expect((await adapters.leases.list(new AbortController().signal)).complete).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
