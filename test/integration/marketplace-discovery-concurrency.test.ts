import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPackagedPluginHost } from "../../src/composition/create-packaged-plugin-host.js";
import { createLocalMarketplace, extensionContext, fakePi } from "../helpers/packaged-marketplace.js";

describe("packaged marketplace discovery concurrency", () => {
  it("coalesces duplicate adds and keeps refresh/remove publication atomic", async () => {
    const root = await mkdtemp(join(tmpdir(), "pi-marketplace-concurrency-"));
    const agentDir = join(root, "agent");
    const project = join(root, "project");
    await Promise.all([mkdir(agentDir), mkdir(project)]);
    const repository = await createLocalMarketplace(root);
    const host = createPackagedPluginHost({ pi: fakePi().api as never, agentDir });
    try {
      const started = await host.start({ type: "session_start", reason: "startup" } as never, extensionContext(project) as never);
      const request = { source: { kind: "local-git" as const, path: repository }, scope: "user" as const, origin: { kind: "native" as const } };
      const added = await Promise.all([
        started.application.marketplace.registration.add(request, new AbortController().signal),
        started.application.marketplace.registration.add(request, new AbortController().signal),
      ]);
      if (added.every((result) => result.kind === "rejected" && result.code === "PROMOTION_FAILED")) {
        expect(added).toEqual([
          { kind: "rejected", code: "PROMOTION_FAILED" },
          { kind: "rejected", code: "PROMOTION_FAILED" },
        ]);
        return;
      }
      expect(added.map((result) => result.kind).sort()).toEqual(["added", "unchanged"]);
      const registration = added.find((result) => result.kind === "added" || result.kind === "unchanged")!;
      if (registration.kind !== "added" && registration.kind !== "unchanged") throw new Error("registration unavailable");

      const [refresh, removal] = await Promise.all([
        started.application.marketplace.refresh.refresh({ trigger: "explicit", scope: "user", registrationIds: [registration.registration.id] }, new AbortController().signal),
        started.application.marketplace.registration.remove({ scope: "user", registrationId: registration.registration.id }, new AbortController().signal),
      ]);
      expect(removal).toMatchObject({ kind: "removed" });
      expect(refresh.outcomes[0]?.kind).toMatch(/refreshed|failed|not-configured/);
      if (refresh.outcomes[0]?.kind === "failed") expect(refresh.outcomes[0].code).toBe("REMOVED_DURING_REFRESH");
      const listed = await started.application.marketplace.registration.list({ scope: "user", limit: 50 }, new AbortController().signal);
      expect(listed.registrations).toEqual([]);
    } finally {
      await host.dispose("quit");
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});
