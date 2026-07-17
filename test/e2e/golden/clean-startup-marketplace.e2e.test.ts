import { afterEach, describe, expect, it } from "vitest";
import { E2E_CHECKOUT_ROOT } from "../harness/constants.js";
import { cleanupSandbox, createCleanE2ESandbox, type CleanE2ESandbox } from "../harness/environment.js";
import { candidate, seedRemoteMarketplace, startPackedRpc } from "../harness/journey.js";

let sandbox: CleanE2ESandbox | undefined;
afterEach(async () => {
  if (sandbox !== undefined) await cleanupSandbox(sandbox);
  sandbox = undefined;
});

const plugins = [
  "core-local@native-e2e-market",
  "project-local@native-e2e-market",
  "secret-required@native-e2e-market",
  "mcp-required@native-e2e-market",
  "subagent-required@native-e2e-market",
  "incompatible@native-e2e-market",
];

describe("packed golden startup, marketplace, browse, and inspection", () => {
  it("starts empty and reports only honest local runtime capabilities", async () => {
    sandbox = await createCleanE2ESandbox("golden-clean-startup");
    const rpc = await startPackedRpc(sandbox);
    const [status, installed, marketplaces] = await Promise.all([
      rpc.plugin("--non-interactive status", "status"),
      rpc.plugin("--non-interactive list --scope all-current --limit 50", "inspection.list"),
      rpc.plugin("--non-interactive marketplace list --scope all-current --limit 50", "marketplace.list"),
    ]);
    expect(status.envelope.data).toMatchObject({
      status: "ready",
      capabilities: {
        secrets: { status: "unavailable" },
        mcp: { status: "unavailable" },
        subagents: { status: "unavailable" },
        piReload: { status: "available" },
      },
    });
    expect(installed.envelope.data.items).toEqual([]);
    expect(marketplaces.envelope.data.registrations).toEqual([]);
    await rpc.shutdown();
  });

  it("adds one HTTPS Git marketplace and keeps exact candidate identities stable", async () => {
    sandbox = await createCleanE2ESandbox("golden-marketplace-browse");
    const journey = await seedRemoteMarketplace(sandbox);
    expect(journey.browse.envelope.data.candidates.map((entry: any) => entry.plugin).sort()).toEqual(plugins.toSorted());
    const core = candidate(journey.browse, plugins[0]!);
    const secondRead = await journey.rpc.plugin("--non-interactive browse --scope user --limit 50", "browse");
    expect(candidate(secondRead, plugins[0]!).id).toBe(core.id);
    expect(candidate(secondRead, plugins[0]!).snapshot).toBe(core.snapshot);
    expect(JSON.stringify(secondRead)).not.toContain(E2E_CHECKOUT_ROOT);
    await journey.rpc.shutdown();
  });

  // idea-fix-packed-candidate-inspection: packed candidate detail currently
  // collapses to CONTROL_INTERNAL after successful browse. Keep the exact
  // expected detail and unavailable-sibling assertions executable as an xfail.
  it.fails("exposes exact candidate detail and unavailable siblings [idea-fix-packed-candidate-inspection]", async () => {
    sandbox = await createCleanE2ESandbox("golden-candidate-inspection-xfail");
    const journey = await seedRemoteMarketplace(sandbox);
    const detail = await journey.rpc.plugin(`--non-interactive show ${plugins[0]} --scope user`, "inspection.show");
    expect(detail.envelope).toMatchObject({
      status: "ok",
      data: {
        kind: "found",
        detail: {
          summary: { plugin: plugins[0] },
          compatibility: {
            status: "activatable",
            components: { counts: { skills: 1, hooks: 1, mcpServers: 0, foreign: 0 } },
          },
          trust: "required",
        },
      },
    });
    for (const plugin of plugins.slice(2)) {
      const report = await journey.rpc.plugin(`--non-interactive show ${plugin} --scope user`, "inspection.show");
      expect(report.envelope).toMatchObject({ status: "ok", data: { kind: "found" } });
      expect(report.envelope.data.detail.compatibility.status).not.toBe("activatable");
    }
    await journey.rpc.shutdown();
  });
});
