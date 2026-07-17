import { describe, expect, it } from "vitest";
import { createNodePiRuntimeCapabilityProbe } from "../../src/composition/node-pi-runtime-capability-probe.js";
import { RuntimeCapabilityRegistry } from "../../src/domain/compatibility-policy.js";

const executables = {
  async resolve(request: { command: string }) {
    if (request.command !== "bash") throw new Error("missing");
    return { executable: "/bin/bash", resolution: "path" as const, identity: "bash" as never };
  },
};

describe("Node/Pi runtime capability probe", () => {
  it("returns every registry fact exactly once and preserves optional adapter absence", async () => {
    const probe = createNodePiRuntimeCapabilityProbe({
      commandHooks: true,
      skillToolRestrictions: true,
      executables,
      nodeVersion: "24.0.0",
      piVersion: "0.80.8",
    });
    const snapshot = await probe.snapshot(new AbortController().signal);
    expect(Object.keys(snapshot.capabilities).sort()).toEqual(
      Object.values(RuntimeCapabilityRegistry).map((entry) => entry.id).sort(),
    );
    expect(snapshot.capabilities[RuntimeCapabilityRegistry.commandHooks.id].status).toBe("available");
    expect(snapshot.capabilities[RuntimeCapabilityRegistry.bash.id].status).toBe("available");
    expect(snapshot.capabilities[RuntimeCapabilityRegistry.powershell.id].status).toBe("unavailable");
    expect(snapshot.capabilities[RuntimeCapabilityRegistry.mcpRuntime.id].status).toBe("unavailable");
    expect(snapshot.capabilities[RuntimeCapabilityRegistry.subagentInterception.id].status).toBe("unavailable");
  });

  it("treats malformed present runtime evidence as failure rather than absence", async () => {
    const probe = createNodePiRuntimeCapabilityProbe({
      commandHooks: true,
      skillToolRestrictions: true,
      executables,
      mcp: { capabilities: async () => ({}) } as never,
      nodeVersion: "24.0.0",
      piVersion: "0.80.8",
    });
    await expect(probe.snapshot(new AbortController().signal)).rejects.toMatchObject({ code: "ADAPTER_FAILED" });
  });
});
