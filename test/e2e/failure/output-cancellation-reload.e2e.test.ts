import { afterEach, describe, expect, it } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cleanupSandbox, createCleanE2ESandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { seedRemoteMarketplace } from "../harness/journey.js";
import { PiRpcProcess } from "../harness/pi-rpc.js";
import { runChecked } from "../harness/process.js";
import { pauseNextGitBackend, waitForFile } from "../harness/faults.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

describe("packed output, cancellation, and reload failure boundaries", () => {
  it.fails("cancels a real slow Git refresh without replacing the selected catalog [idea-packed-refresh-cancellation-state-stale]", async () => {
    sandbox = await createCleanE2ESandbox("failure-cancel-refresh");
    const journey = await seedRemoteMarketplace(sandbox);
    const policy = await journey.rpc.plugin("updates policy set --kind cadence --target global --cadence paused", "updates.policy.set");
    expect(policy.envelope.status).toMatch(/ok|no-change/u);
    const baseline = journey.browse.envelope.data.candidates.map((entry: any) => [entry.plugin, entry.snapshot]);
    await pauseNextGitBackend(journey.git.controlFile);
    const pending = journey.rpc.plugin("marketplace refresh --scope user", "marketplace.refresh", 30_000);
    await waitForFile(journey.git.phaseFile, "backend-paused", 15_000);
    await journey.rpc.abort();
    journey.git.resume();
    const cancelled = await pending;
    expect(cancelled.envelope.status).toBe("partial");
    expect(JSON.stringify(cancelled.envelope.data)).toMatch(/CANCELLED|ABORTED|cancelled|aborted/u);
    const after = await journey.rpc.plugin("--non-interactive browse --scope user --limit 50", "browse");
    expect(after.envelope.data.candidates.map((entry: any) => [entry.plugin, entry.snapshot])).toEqual(baseline);
    await journey.rpc.shutdown();
  });

  it("keeps the last selected catalog after malformed remote output", async () => {
    sandbox = await createCleanE2ESandbox("failure-malformed-refresh");
    const journey = await seedRemoteMarketplace(sandbox);
    const baseline = journey.browse.envelope.data.candidates.map((entry: any) => entry.id);
    await writeFile(join(journey.repository.working, ".claude-plugin", "marketplace.json"), "{malformed-json\n");
    await runChecked(sandbox.capabilities.git, ["add", "."], { cwd: journey.repository.working, env: sandbox.env });
    await runChecked(sandbox.capabilities.git, ["commit", "--quiet", "-m", "malformed catalog"], { cwd: journey.repository.working, env: sandbox.env });
    await runChecked(sandbox.capabilities.git, ["push", "--quiet", "origin", "main"], { cwd: journey.repository.working, env: sandbox.env });
    const refresh = await journey.rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh", 30_000);
    expect(refresh.envelope.status).not.toBe("ok");
    const after = await journey.rpc.plugin("--non-interactive browse --scope user --limit 50", "browse");
    expect(after.envelope.data.candidates.map((entry: any) => entry.id)).toEqual(baseline);
    await journey.rpc.shutdown();
  });

  it("survives a closed RPC output channel and reports durable state after restart", async () => {
    sandbox = await createCleanE2ESandbox("failure-closed-rpc-output");
    const journey = await seedRemoteMarketplace(sandbox);
    await journey.rpc.plugin("--non-interactive status", "status");
    journey.rpc.process.child.stdout.destroy();
    journey.rpc.process.write(`${JSON.stringify({ id: "closed-output", type: "prompt", message: `/${journey.rpc.commandName} status` })}\n`);
    journey.rpc.process.endInput();
    await journey.rpc.process.waitForExit(15_000).catch(async () => { await journey.rpc.process.terminate(); });
    const restarted = await PiRpcProcess.start({ sandbox });
    const status = await restarted.plugin("--non-interactive status", "status");
    expect(status.envelope.status).toBe("ok");
    await restarted.shutdown();
  });

  it.fails("preserves owner truth after post-commit cancellation and reload successor loss [idea-production-projection-publication]", async () => {
    sandbox = await createCleanE2ESandbox("failure-reload-owner-xfail");
    const journey = await seedRemoteMarketplace(sandbox);
    const install = await journey.rpc.plugin("install core-local@native-e2e-market --scope user", "install.run");
    expect(install.envelope.data.kind).toBe("succeeded");
    journey.rpc.process.signal("SIGKILL");
    await journey.rpc.process.waitForExit(10_000);
    const successor = await PiRpcProcess.start({ sandbox });
    const installed = await successor.plugin("--non-interactive list --scope user", "inspection.list");
    expect(installed.envelope.data.items).toContainEqual(expect.objectContaining({ plugin: "core-local@native-e2e-market" }));
    const operations = await successor.plugin("--non-interactive diagnose core-local@native-e2e-market --scope user", "inspection.diagnose");
    expect(JSON.stringify(operations.envelope.data)).not.toMatch(/STALE_CONTEXT|PARTIAL/u);
    await successor.shutdown();
  });
});
