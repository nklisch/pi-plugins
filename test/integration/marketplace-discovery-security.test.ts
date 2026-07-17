import { mkdtemp, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPackagedPluginHost } from "../../src/composition/create-packaged-plugin-host.js";
import { createLocalMarketplace, extensionContext, fakePi } from "../helpers/packaged-marketplace.js";

describe("packaged marketplace discovery security", () => {
  it("rejects untrusted project mutation, credential URLs, and symlink local roots without leaking paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-marketplace-security-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    const repository = await createLocalMarketplace(root);
    const alias = join(root, "marketplace-alias");
    await symlink(repository, alias);
    const host = createPackagedPluginHost({ pi: fakePi().api as never, agentDir });
    try {
      const started = await host.start({ type: "session_start", reason: "startup" } as never, extensionContext(project, false) as never);
      const untrusted = await started.application.marketplace.registration.add({
        source: { kind: "github", repository: "example/community" },
        scope: "project",
        origin: { kind: "native" },
      }, new AbortController().signal);
      expect(untrusted).toEqual({ kind: "rejected", code: "PROJECT_UNTRUSTED" });

      const credential = await started.application.marketplace.registration.add({
        source: { kind: "git", url: "https://secret:marker@example.test/catalog.git" } as never,
        scope: "user",
        origin: { kind: "native" },
      }, new AbortController().signal);
      expect(credential).toEqual({ kind: "rejected", code: "INVALID_SOURCE" });
      expect(JSON.stringify(credential)).not.toContain("secret");

      const symlinked = await started.application.marketplace.registration.add({
        source: { kind: "local-git", path: alias },
        scope: "user",
        origin: { kind: "native" },
      }, new AbortController().signal);
      expect(symlinked).toEqual({ kind: "rejected", code: "INVALID_SOURCE" });
      expect(JSON.stringify(symlinked)).not.toContain(root);
    } finally {
      await host.dispose("quit");
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
