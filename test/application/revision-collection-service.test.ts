import { describe, expect, it } from "vitest";
import { createRevisionCollectionService } from "../../src/application/revision-collection-service.js";

describe("revision collection service", () => {
  it("defers before any deletion when scope discovery is incomplete", async () => {
    let removed = false;
    const service = createRevisionCollectionService({
      state: {} as never,
      inventory: { async discover() { return { scopes: [], complete: false }; } },
      transitions: (() => ({}) as never),
      leases: {} as never,
      artifacts: { async scan() { removed = true; return { complete: true, artifacts: [] }; }, async remove() { removed = true; return "removed"; } },
      retention: {} as never,
      mutations: {} as never,
      sha256: () => new Uint8Array(32),
      clock: { nowEpochMilliseconds: () => 100, monotonicMilliseconds: () => 0 },
    });
    await expect(service.collect({}, new AbortController().signal)).resolves.toMatchObject({ kind: "deferred", code: "COLLECTION_DEFERRED" });
    expect(removed).toBe(false);
  });

  it("uses the retained-artifact union with no persistent-data variant", async () => {
    let requestedKinds: string[] = [];
    const artifact = { kind: "plugin" as const, key: "plugin-store-v1:sha256:" + "a".repeat(64), reference: { kind: "plugin" as const, key: "plugin-store-v1:sha256:" + "a".repeat(64) as never }, capability: {} };
    const service = createRevisionCollectionService({
      state: {} as never,
      inventory: { async discover() { return { scopes: [], complete: true }; } },
      transitions: (() => ({ list: async () => ({ entries: [], complete: true, diagnostics: [] }) }) as never),
      leases: { async list() { return { complete: true, leases: [], owners: [] }; } } as never,
      artifacts: { async scan() { return { complete: true, artifacts: [artifact] }; }, async remove(candidate) { requestedKinds.push(candidate.reference.kind); return "removed"; } },
      retention: { async reconcile({ observed }: { observed: readonly unknown[] }) { return { complete: true, marks: observed.map((reference) => ({ reference, firstUnreferencedAt: 0 })) }; }, async markRemoved() {} } as never,
      mutations: {} as never,
      sha256: () => new Uint8Array(32),
      clock: { nowEpochMilliseconds: () => 86_400_001, monotonicMilliseconds: () => 0 },
    });
    const result = await service.collect({ policy: { unreferencedGraceMs: 86_400_000 } }, new AbortController().signal);
    expect(result.kind).toBe("collected");
    expect(requestedKinds).toEqual(["plugin"]);
  });
});
