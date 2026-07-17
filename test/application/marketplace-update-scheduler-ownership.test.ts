import { describe, expect, it } from "vitest";
import { createMarketplaceUpdateScheduler } from "../../src/application/marketplace-update-scheduler.js";

const owner = "update-scheduler-lease-v1:uuid:123e4567-e89b-42d3-a456-426614174000" as any;
const scope = { kind: "user" as const };
const registrationId = `marketplace-registration-v1:sha256:${"a".repeat(64)}` as any;

function schedulerEnvironment(options: { dueAt: number; regressed?: boolean; forwardAfterWait?: number }) {
  let now = 1_000;
  let refreshes = 0;
  const controller = new AbortController();
  const scheduler = createMarketplaceUpdateScheduler({
    refresh: {
      async refresh() { throw new Error("legacy path should not run"); },
      async refreshScheduled() { refreshes += 1; controller.abort(new Error("done")); return { outcomes: [], notifications: [] }; },
      async nextScheduledAt() { return options.dueAt; },
    },
    leases: {
      async inventory() { return { plans: [{ context: scope, scope, registrationIds: [registrationId], enabled: true, dueAt: options.dueAt, clock: options.regressed ? "regressed" as const : "current" as const }], complete: true }; },
      async acquire() { return "self" as const; },
      async renew() { return true; },
      async release() {},
      async validate() { return true; },
    },
    leaseIds: { async create() { return owner; } },
    clock: { nowEpochMilliseconds: () => now, monotonicMilliseconds: () => now },
    delay: { async wait() { if (options.forwardAfterWait !== undefined) { now = options.forwardAfterWait; options.dueAt = now; } else controller.abort(new Error("waited")); } },
    inventoryPollMs: 100,
    leaseMs: 1_000,
  });
  return { scheduler, controller, refreshes: () => refreshes };
}

describe("lease-owned marketplace scheduler", () => {
  it("honors persisted future due time on restart", async () => {
    const env = schedulerEnvironment({ dueAt: 5_000 });
    await expect(env.scheduler.run(env.controller.signal)).rejects.toThrow("waited");
    expect(env.refreshes()).toBe(0);
  });

  it("rereads wall time after a monotonic wait and runs forward-jump due work", async () => {
    const env = schedulerEnvironment({ dueAt: 5_000, forwardAfterWait: 6_000 });
    await expect(env.scheduler.run(env.controller.signal)).rejects.toThrow("done");
    expect(env.refreshes()).toBe(1);
  });

  it("pauses scheduled work while the wall clock is regressed", async () => {
    const env = schedulerEnvironment({ dueAt: 5_000, regressed: true });
    await expect(env.scheduler.run(env.controller.signal)).rejects.toThrow("waited");
    expect(env.refreshes()).toBe(0);
    await expect(env.scheduler.status(new AbortController().signal)).resolves.toMatchObject({ state: "stopped", scopes: [{ ownership: "self" }] });
  });
});
