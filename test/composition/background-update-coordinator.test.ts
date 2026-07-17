import { describe, expect, it } from "vitest";
import { createBackgroundUpdateCoordinator } from "../../src/composition/background-update-coordinator.js";
import { createHostStatusService } from "../../src/composition/host-status-service.js";

const startup = {
  status: "ready" as const, blocked: [],
  capabilities: {
    mcp: { status: "unavailable" as const, explanation: "optional" }, subagents: { status: "unavailable" as const, explanation: "optional" },
    piReload: { status: "available" as const, explanation: "available" }, secrets: { status: "unavailable" as const, explanation: "optional" },
  },
};

describe("background update coordinator", () => {
  it("starts no task or timer when policy inventory is disabled", async () => {
    let runs = 0;
    const status = createHostStatusService({ startup });
    const coordinator = createBackgroundUpdateCoordinator({
      scheduler: { async run() { runs += 1; }, async status() { return { state: "disabled", scopes: [] }; } },
      status, async enabled() { return false; },
    });
    await coordinator.start();
    expect(runs).toBe(0);
    expect(status.snapshot().update.state).toBe("disabled");
    await coordinator.close();
  });

  it("aborts and drains the one scheduler task idempotently", async () => {
    let settled = false;
    const status = createHostStatusService({ startup });
    const coordinator = createBackgroundUpdateCoordinator({
      scheduler: {
        async run(signal) { await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })); settled = true; },
        async status() { return { state: "running", scopes: [] }; },
      },
      status, async enabled() { return true; },
    });
    await coordinator.start();
    await Promise.all([coordinator.close(), coordinator.close()]);
    expect(settled).toBe(true);
    expect(status.snapshot().update.state).toBe("stopped");
  });
});
