import { afterEach, describe, expect, it } from "vitest";
import { cleanupSandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { createProductionE2ESandbox } from "../harness/production-environment.js";
import { startProductionModelService } from "../harness/production-model-service.js";
import {
  installProductionBundle,
  observeProductionBundle,
  productionModelArgs,
  PRODUCTION_PLUGIN,
  publishProductionBundleRevision,
} from "../harness/production-bundle.js";
import { seedRemoteMarketplace } from "../harness/journey.js";
import { PiRpcProcess } from "../harness/pi-rpc.js";
import { fileInventory } from "../harness/state-inspector.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async (context) => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox, context);
  sandbox = undefined;
});

const active = (revision: "v1" | "v2") => ({
  revision,
  skill: "present" as const,
  ordinaryHooks: "active" as const,
  subagent: "injected-and-continued" as const,
  mcp: "registered" as const,
  alias: "runtime-unavailable-omission" as const,
});

const inactive = (revision: "v1" | "v2") => ({
  revision,
  skill: "absent" as const,
  ordinaryHooks: "inactive" as const,
  subagent: "inactive" as const,
  mcp: "absent" as const,
  alias: "runtime-unavailable-omission" as const,
});

describe("golden production full-bundle lifecycle", () => {
  it("installs, observes, disables, enables, updates, and uninstalls one exact bundle", async () => {
    sandbox = await createProductionE2ESandbox("production-golden-bundle");
    const model = await startProductionModelService(sandbox);
    const journey = await seedRemoteMarketplace(sandbox, { extraArgs: productionModelArgs });
    await installProductionBundle({ sandbox, rpc: journey.rpc, version: "v1" });
    await journey.rpc.shutdown();

    let rpc = await PiRpcProcess.start({ sandbox, extraArgs: productionModelArgs });
    await observeProductionBundle(rpc, active("v1"), model);

    const disabled = await rpc.plugin(`disable ${PRODUCTION_PLUGIN} --scope user --yes`, "lifecycle.disable");
    expect(disabled.envelope.data).toMatchObject({ kind: "succeeded" });
    await observeProductionBundle(rpc, inactive("v1"), model);

    const enabled = await rpc.plugin(`enable ${PRODUCTION_PLUGIN} --scope user --yes`, "lifecycle.enable");
    expect(enabled.envelope.data).toMatchObject({ kind: "succeeded" });
    await observeProductionBundle(rpc, active("v1"), model);

    await publishProductionBundleRevision(sandbox, journey.repository, "v2");
    const refreshed = await rpc.plugin("--non-interactive marketplace refresh --scope user", "marketplace.refresh");
    expect(refreshed.envelope.status).toBe("ok");
    const updated = await rpc.plugin(`update ${PRODUCTION_PLUGIN} --scope user --yes`, "lifecycle.update");
    expect(updated.envelope.data).toMatchObject({ kind: "succeeded" });
    await rpc.shutdown();

    rpc = await PiRpcProcess.start({ sandbox, extraArgs: productionModelArgs });
    await observeProductionBundle(rpc, active("v2"), model);
    const hookFiles = (await fileInventory(sandbox.agentDir)).filter((entry) => entry.path.endsWith("production-hooks.jsonl"));
    expect(hookFiles.length).toBeGreaterThan(0);

    const removed = await rpc.plugin(`uninstall ${PRODUCTION_PLUGIN} --scope user --delete-data --yes`, "lifecycle.uninstall");
    expect(removed.envelope.data).toMatchObject({ kind: "succeeded" });
    await rpc.shutdown();

    rpc = await PiRpcProcess.start({ sandbox, extraArgs: productionModelArgs });
    await observeProductionBundle(rpc, inactive("v2"), model);
    const listed = await rpc.plugin("--non-interactive list --scope user", "inspection.list");
    expect(listed.envelope.data.items).not.toContainEqual(expect.objectContaining({ plugin: PRODUCTION_PLUGIN }));
    const marketplaces = await rpc.plugin("--non-interactive marketplace list --scope user", "marketplace.list");
    expect(marketplaces.envelope.data.registrations).toContainEqual(expect.objectContaining({ marketplace: "native-e2e-market" }));
    await rpc.shutdown();
  });
});
