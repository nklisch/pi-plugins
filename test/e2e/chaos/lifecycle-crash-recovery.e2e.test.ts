import { afterEach, describe, expect, it } from "vitest";
import { cleanupSandbox, createCleanE2ESandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { pauseNextGitBackend, waitForFile } from "../harness/faults.js";
import { publishFixtureRevision } from "../harness/git-service.js";
import { seedRemoteMarketplace } from "../harness/journey.js";
import { PiRpcProcess } from "../harness/pi-rpc.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

describe("deterministic packed publication and lifecycle crash recovery", () => {
  it.fails("kills Pi at a real Git acquisition boundary, retains V1, and retries to one V2 snapshot [idea-recover-crashed-refresh-claim]", async () => {
    sandbox = await createCleanE2ESandbox("chaos-publication-kill");
    const journey = await seedRemoteMarketplace(sandbox);
    await journey.rpc.plugin("updates policy set --kind cadence --target global --cadence paused", "updates.policy.set");
    const before = journey.browse.envelope.data.candidates.find((entry: any) => entry.plugin === "core-local@native-e2e-market");
    await publishFixtureRevision(sandbox, journey.repository, "2.0.0", "v2");
    await pauseNextGitBackend(journey.git.controlFile);
    const refresh = journey.rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh", 30_000);
    await waitForFile(journey.git.phaseFile, "backend-paused", 15_000);
    journey.rpc.process.signal("SIGKILL");
    await journey.rpc.process.waitForExit(10_000);
    await refresh.catch(() => undefined);
    journey.git.resume();

    const restarted = await PiRpcProcess.start({ sandbox });
    const retained = await restarted.plugin("--non-interactive browse --scope user --limit 50", "browse");
    const retainedCore = retained.envelope.data.candidates.find((entry: any) => entry.plugin === "core-local@native-e2e-market");
    expect(retainedCore.snapshot).toBe(before.snapshot);
    const retried = await restarted.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh", 30_000);
    expect(retried.envelope.status).toBe("ok");
    const after = await restarted.plugin("--non-interactive browse --scope user --limit 50", "browse");
    const v2 = after.envelope.data.candidates.filter((entry: any) => entry.plugin === "core-local@native-e2e-market");
    expect(v2).toHaveLength(1);
    expect(v2[0].snapshot).not.toBe(before.snapshot);
    await restarted.shutdown();
  });

  it.fails("recovers a killed pending lifecycle/reload handoff to exactly V1 or V2 [idea-production-projection-publication]", async () => {
    sandbox = await createCleanE2ESandbox("chaos-lifecycle-kill-xfail");
    const journey = await seedRemoteMarketplace(sandbox);
    const installed = await journey.rpc.plugin("install core-local@native-e2e-market --scope user", "install.run");
    expect(installed.envelope.data.kind).toBe("succeeded");
    await publishFixtureRevision(sandbox, journey.repository, "2.0.0", "v2");
    await journey.rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh");
    const update = journey.rpc.plugin("update core-local@native-e2e-market --scope user --yes", "lifecycle.update", 60_000);
    await waitForFile(`${sandbox.agentDir}/plugin-host/recovery/v1/transitions.sqlite`, undefined, 15_000);
    journey.rpc.process.signal("SIGKILL");
    await journey.rpc.process.waitForExit(10_000);
    await update.catch(() => undefined);
    const recovered = await PiRpcProcess.start({ sandbox });
    const list = await recovered.plugin("--non-interactive list --scope user", "inspection.list");
    const rows = list.envelope.data.items.filter((entry: any) => entry.plugin === "core-local@native-e2e-market");
    expect(rows).toHaveLength(1);
    expect(rows[0].lifecycle.transition).toBe("none");
    const commands = await recovered.request({ type: "get_commands" });
    expect(commands.data.commands).toContainEqual(expect.objectContaining({ name: "skill:core-local" }));
    await recovered.shutdown();
  });
});
