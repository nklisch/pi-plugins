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

  it("can be awakened after initially disabled policy inventory changes", async () => {
    let enabled = false;
    let runs = 0;
    const status = createHostStatusService({ startup });
    const coordinator = createBackgroundUpdateCoordinator({
      scheduler: {
        async run(signal) {
          runs += 1;
          await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
        },
        async status() { return { state: "running", scopes: [] }; },
      },
      status,
      async enabled() { return enabled; },
    });
    await coordinator.start();
    expect(runs).toBe(0);
    enabled = true;
    await coordinator.start();
    expect(runs).toBe(1);
    await coordinator.close();
  });

  it("runs ledger and automatic maintenance after every scheduler refresh cycle", async () => {
    let reconciliations = 0;
    let automaticRuns = 0;
    const status = createHostStatusService({ startup });
    const coordinator = createBackgroundUpdateCoordinator({
      scheduler: {
        async run(signal, afterRefresh) {
          await afterRefresh?.(signal);
          await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
        },
        async status() { return { state: "running", scopes: [] }; },
      },
      notifications: {
        async reconcile() { reconciliations += 1; return { resolved: [], pruned: 0, unreadCount: 2, unresolvedCount: 3 }; },
        async dispatch() { return { published: [], pending: 0, failed: 0 }; },
      } as never,
      automatic: { async run() { automaticRuns += 1; return { outcomes: [] }; } },
      status,
      async enabled() { return true; },
    });
    await coordinator.start();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await coordinator.close();
    expect(reconciliations).toBe(2);
    expect(automaticRuns).toBe(2);
    expect(status.snapshot().update).toMatchObject({ unreadCount: 2, unresolvedCount: 3 });
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
