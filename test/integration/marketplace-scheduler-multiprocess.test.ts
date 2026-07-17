import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createStateUpdateSchedulerLeasePort } from "../../src/application/update-scheduler-lease-state.js";
import { createMarketplaceConfigurationRecord } from "../../src/domain/update-policy.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const scope = { kind: "user" as const };
const ownerA = "update-scheduler-lease-v1:uuid:123e4567-e89b-42d3-a456-426614174000" as any;
const ownerB = "update-scheduler-lease-v1:uuid:123e4567-e89b-42d3-a456-426614174001" as any;

function environment() {
  let now = 1_000;
  let generation = 0;
  let config: any = {
    schemaVersion: 4, generation,
    global: { application: "manual", cadence: "balanced" }, scope: {},
    records: [createMarketplaceConfigurationRecord({ marketplace: "community", source: { kind: "github", repository: "example/community" } })],
  };
  const snapshot = () => ({ scope, generation, config, installed: { schemaVersion: 2, generation, marketplaces: [], plugins: [] }, trust: { schemaVersion: 1, generation, records: [] }, pointers: { schemaVersion: 1, scope, generation, documents: [] }, corruptions: [] }) as any;
  let queue = Promise.resolve();
  const dependencies = {
    state: { async read() { return { ok: true as const, snapshot: snapshot() }; } },
    inventory: { async discover() { return { scopes: [scope], complete: true }; } },
    mutations: {
      async runPreparedMutation(request: any, prepare: any) {
        let release!: () => void;
        const previous = queue;
        queue = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        try {
          if (request.expectedGeneration !== generation) return { kind: "stale-generation", expected: request.expectedGeneration, actual: generation };
          const prepared = await prepare({ snapshot: snapshot(), assertOwned: async () => undefined });
          generation += 1;
          config = { ...prepared.mutation.replace.config, generation };
          return { kind: "committed", value: prepared.value, snapshot: snapshot() };
        } finally { release(); }
      },
    },
    clock: { nowEpochMilliseconds: () => now, monotonicMilliseconds: () => now }, sha256,
  } as any;
  return { dependencies, setNow(value: number) { now = value; }, setLease(value: unknown) { config = { ...config, scope: { schedulerLease: value } }; } };
}

describe("multiprocess update scheduler ownership", () => {
  it("elects one owner per scope and fences the loser", async () => {
    const env = environment();
    const left = createStateUpdateSchedulerLeasePort(env.dependencies);
    const right = createStateUpdateSchedulerLeasePort(env.dependencies);
    const results = await Promise.all([
      left.acquire(scope, ownerA, 1_000, 1_000, signal),
      right.acquire(scope, ownerB, 1_000, 1_000, signal),
    ]);
    const winner = results[0] === "self" ? ownerA : ownerB;
    expect([...results].sort()).toEqual(["other", "self"]);
    const loser = winner === ownerA ? ownerB : ownerA;
    expect(await left.validate(scope, winner, 1_001, signal)).toBe(true);
    expect(await right.validate(scope, loser, 1_001, signal)).toBe(false);
  });

  it("expires future-clock and elapsed leases for deterministic takeover", async () => {
    const env = environment();
    env.setLease({ id: ownerA, startedAt: 5_000, renewedAt: 5_000, expiresAt: 6_000 });
    const port = createStateUpdateSchedulerLeasePort(env.dependencies);
    expect(await port.acquire(scope, ownerB, 1_000, 1_000, signal)).toBe("self");
    env.setNow(3_000);
    expect(await port.acquire(scope, ownerA, 3_000, 1_000, signal)).toBe("self");
  });
});
