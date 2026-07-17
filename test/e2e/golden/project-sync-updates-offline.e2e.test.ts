import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupSandbox, createCleanE2ESandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { publishFixtureRevision } from "../harness/git-service.js";
import { seedRemoteMarketplace } from "../harness/journey.js";
import { PiRpcProcess } from "../harness/pi-rpc.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

describe("packed project sync, update policy, and offline restart", () => {
  it("publishes canonical portable empty project intent without machine state", async () => {
    sandbox = await createCleanE2ESandbox("golden-project-sync");
    const journey = await seedRemoteMarketplace(sandbox);
    const result = await journey.rpc.plugin("project sync --mode publish-intent --yes", "project.sync");
    expect(result.envelope).toMatchObject({ status: "ok", data: { kind: "succeeded" } });
    const path = join(sandbox.project, ".pi", "plugins.json");
    const text = await readFile(path, "utf8");
    expect(text.endsWith("\n")).toBe(true);
    const intent = JSON.parse(text);
    expect(intent).toMatchObject({ schemaVersion: 1, marketplaces: [], plugins: [] });
    expect(text).not.toMatch(/\/tmp\/|revision|configuration|trust|cache|timestamp|secret/iu);
    const converged = await journey.rpc.plugin("project sync --mode apply-intent", "project.sync");
    expect(converged.envelope.status).toMatch(/ok|no-change/u);
    await journey.rpc.shutdown();
  });

  it("restarts offline from the selected local catalog without new Git requests", async () => {
    sandbox = await createCleanE2ESandbox("golden-offline-restart");
    const journey = await seedRemoteMarketplace(sandbox);
    const before = await journey.git.requestCount();
    await journey.rpc.shutdown();
    await journey.git.stop();
    sandbox.env.PI_OFFLINE = "1";
    const started = Date.now();
    const offline = await PiRpcProcess.start({ sandbox });
    const startupMs = Date.now() - started;
    const [status, browse] = await Promise.all([
      offline.plugin("--non-interactive status", "status"),
      offline.plugin("--non-interactive browse --scope user --limit 50", "browse"),
    ]);
    expect(startupMs).toBeLessThan(15_000);
    expect(status.envelope.status).toBe("ok");
    expect(browse.envelope.data.candidates).toContainEqual(expect.objectContaining({ plugin: "core-local@native-e2e-market" }));
    expect(await journey.git.requestCount()).toBe(before);
    await offline.shutdown();
  });

  it.fails("deduplicates V2/V3 notices and applies exact manual/automatic updates [idea-production-projection-publication]", async () => {
    sandbox = await createCleanE2ESandbox("golden-update-notices-xfail");
    const journey = await seedRemoteMarketplace(sandbox);
    const installed = await journey.rpc.plugin("install core-local@native-e2e-market --scope user", "install.run");
    expect(installed.envelope.data.kind).toBe("succeeded");
    await publishFixtureRevision(sandbox, journey.repository, "2.0.0", "v2");
    await journey.rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh");
    const notices = await journey.rpc.plugin("--non-interactive updates notices list --scope user", "updates.notices.list");
    expect(notices.envelope.data.notices).toHaveLength(1);
    const noticeId = notices.envelope.data.notices[0].id as string;
    await journey.rpc.plugin(`--non-interactive updates notices acknowledge ${noticeId}`, "updates.notices.acknowledge");
    const updated = await journey.rpc.plugin("update core-local@native-e2e-market --scope user --yes", "lifecycle.update");
    expect(updated.envelope.data.kind).toBe("succeeded");
    await publishFixtureRevision(sandbox, journey.repository, "3.0.0", "v3");
    await journey.rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh");
    const automatic = await journey.rpc.plugin("updates automatic run", "updates.automatic.run");
    expect(automatic.envelope.data.outcomes).toContainEqual(expect.objectContaining({ kind: "applied" }));
    await journey.rpc.shutdown();
  });
});
