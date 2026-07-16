import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { createContentManifest } from "../../src/domain/content-manifest.js";
import { createPluginStoreIdentityFromEvidence } from "../../src/domain/content-store.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import { createInstalledPluginRecord, createInstalledUserStateDocument, createMarketplaceSnapshotRecord } from "../../src/domain/state/installed-state.js";
import { createResolvedMarketplaceSource, createResolvedPluginSource } from "../../src/domain/source.js";
import { createRevisionCollectionService } from "../../src/application/revision-collection-service.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const pluginKey = "collector@community";
const artifact = (key: string) => Object.freeze({ kind: "plugin" as const, key, reference: { kind: "plugin" as const, key: key as never }, capability: {} });

function installedFixture() {
  const compatibility = CompatibilityReportSchema.parse({ plugin: { key: pluginKey, marketplaceName: "community", marketplaceEntryName: "collector" }, activatable: true, components: [], requirements: [], diagnostics: [] });
  const content = createContentManifest([], sha256);
  const plugin = (revision: string) => NormalizedPluginSchema.parse({
    identity: { key: pluginKey, marketplaceName: "community", marketplaceEntryName: "collector" },
    source: createResolvedPluginSource({ kind: "git", url: `https://example.invalid/collector-${revision}.git`, revision: revision.repeat(40) }, sha256),
    configuration: { options: [] }, components: { skills: [], hooks: [], mcpServers: [], foreign: [] }, metadata: [],
  });
  const old = createInstalledPluginRecord({ plugin: pluginKey, activation: "disabled", revisions: [{ plugin: plugin("a"), compatibility, content }], scope: { kind: "user" } }, sha256);
  const current = createInstalledPluginRecord({ plugin: pluginKey, activation: "disabled", revisions: [{ plugin: plugin("b"), compatibility: { ...compatibility, plugin: plugin("b").identity }, content }], scope: { kind: "user" } }, sha256);
  const record = createInstalledPluginRecord({ plugin: pluginKey, activation: "disabled", selectedRevision: current.selectedRevision, revisions: [old.revisions[0]!, current.revisions[0]!], scope: { kind: "user" } }, sha256);
  const marketplaceSource = createResolvedMarketplaceSource({ declared: { kind: "git", url: "https://example.invalid/community.git" }, revision: "c".repeat(40) }, sha256);
  const marketplace = createMarketplaceSnapshotRecord({ marketplace: "community", source: marketplaceSource, content }, sha256);
  const installed = createInstalledUserStateDocument({ generation: 0, marketplaces: [marketplace], plugins: [record] }, sha256);
  const oldRevision = record.revisions.find((revision) => revision.revision === old.selectedRevision)!;
  const oldKey = createPluginStoreIdentityFromEvidence({ sourceHash: oldRevision.evidence.source.sourceHash, binding: oldRevision.revision }, sha256).key;
  return { record, installed, oldKey };
}

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
    const candidate = artifact("plugin-store-v1:sha256:" + "a".repeat(64));
    const service = createRevisionCollectionService({
      state: {} as never,
      inventory: { async discover() { return { scopes: [], complete: true }; } },
      transitions: (() => ({ list: async () => ({ entries: [], complete: true, diagnostics: [] }) }) as never),
      leases: { async list() { return { complete: true, leases: [], owners: [] }; } } as never,
      artifacts: { async scan() { return { complete: true, artifacts: [candidate] }; }, async remove(value) { requestedKinds.push(value.reference.kind); return "removed"; } },
      retention: { async reconcile({ observed }: { observed: readonly unknown[] }) { return { complete: true, marks: observed.map((reference) => ({ reference, firstUnreferencedAt: 0 })) }; }, async markRemoved() {} } as never,
      mutations: {} as never,
      sha256,
      clock: { nowEpochMilliseconds: () => 86_400_001, monotonicMilliseconds: () => 0 },
    });
    const result = await service.collect({ policy: { unreferencedGraceMs: 86_400_000 } }, signal);
    expect(result.kind).toBe("collected");
    expect(requestedKinds).toEqual(["plugin"]);
  });

  it("refreshes leases after pruning and retains a lease acquired in the deletion window", async () => {
    const candidate = artifact("plugin-store-v1:sha256:" + "c".repeat(64));
    const lease = { leaseId: "00000000-0000-4000-8000-000000000201", sessionId: "second-process", artifacts: [candidate.reference], acquiredAt: 1 };
    let leaseReads = 0;
    let removed = 0;
    const service = createRevisionCollectionService({
      state: {} as never,
      inventory: { async discover() { return { scopes: [], complete: true }; } },
      transitions: (() => ({}) as never),
      leases: { async list() { leaseReads += 1; return leaseReads === 1 ? { complete: true, leases: [], owners: [] } : { complete: true, leases: [lease], owners: [{ leaseId: lease.leaseId, status: "live" }] }; } } as never,
      artifacts: { async scan() { return { complete: true, artifacts: [candidate] }; }, async remove() { removed += 1; return "removed"; } },
      retention: { async reconcile({ observed }: { observed: readonly unknown[] }) { return { complete: true, marks: observed.map((reference) => ({ reference, firstUnreferencedAt: 0 })) }; }, async markRemoved() {} } as never,
      mutations: {} as never,
      sha256,
      clock: { nowEpochMilliseconds: () => 86_400_001, monotonicMilliseconds: () => 0 },
    });
    const result = await service.collect({ policy: { unreferencedGraceMs: 0 } }, signal);
    expect(result.kind).toBe("collected");
    expect(leaseReads).toBe(2);
    expect(removed).toBe(0);
  });

  it("defers deletion when refreshed lease evidence is incomplete", async () => {
    const candidate = artifact("plugin-store-v1:sha256:" + "d".repeat(64));
    let leaseReads = 0;
    let removed = 0;
    const service = createRevisionCollectionService({
      state: {} as never,
      inventory: { async discover() { return { scopes: [], complete: true }; } },
      transitions: (() => ({}) as never),
      leases: { async list() { leaseReads += 1; return leaseReads === 1 ? { complete: true, leases: [], owners: [] } : { complete: false, leases: [], owners: [] }; } } as never,
      artifacts: { async scan() { return { complete: true, artifacts: [candidate] }; }, async remove() { removed += 1; return "removed"; } },
      retention: { async reconcile({ observed }: { observed: readonly unknown[] }) { return { complete: true, marks: observed.map((reference) => ({ reference, firstUnreferencedAt: 0 })) }; }, async markRemoved() {} } as never,
      mutations: {} as never,
      sha256,
      clock: { nowEpochMilliseconds: () => 86_400_001, monotonicMilliseconds: () => 0 },
    });
    const result = await service.collect({ policy: { unreferencedGraceMs: 0 } }, signal);
    expect(result).toMatchObject({ kind: "deferred", code: "COLLECTION_DEFERRED" });
    expect(removed).toBe(0);
  });

  it("prunes the authoritative revision record before removing its physical artifact", async () => {
    const fixture = installedFixture();
    let snapshot = { scope: { kind: "user" }, generation: 0, installed: fixture.installed } as never;
    let removed = 0;
    const state = {
      async read() { return { ok: true, snapshot }; },
      async commit() { throw new Error("collection uses the generation coordinator"); },
    };
    const service = createRevisionCollectionService({
      state,
      inventory: { async discover() { return { scopes: [{ kind: "user" }], complete: true }; } },
      transitions: (() => ({ list: async () => ({ entries: [], complete: true, diagnostics: [] }) }) as never),
      leases: { async list() { return { complete: true, leases: [], owners: [] }; } } as never,
      artifacts: {
        async scan() { return { complete: true, artifacts: [artifact(fixture.oldKey)] }; },
        async remove() {
          const installed = (snapshot as { installed: { plugins: readonly { revisions: readonly unknown[] }[] } }).installed;
          expect(installed.plugins[0]?.revisions).toHaveLength(1);
          removed += 1;
          return "removed";
        },
      },
      retention: { async reconcile({ observed }: { observed: readonly unknown[] }) { return { complete: true, marks: observed.map((reference) => ({ reference, firstUnreferencedAt: 0 })) }; }, async markRemoved() {} } as never,
      mutations: {
        async runPreparedMutation(_request: unknown, prepare: (context: { snapshot: never; assertOwned(): Promise<void> }) => Promise<{ mutation: unknown; value: undefined }>) {
          const prepared = await prepare({ snapshot, assertOwned: async () => {} });
          const replacement = (prepared.mutation as { replace: { installed: unknown } }).replace.installed;
          snapshot = { ...(snapshot as object), generation: 1, installed: replacement } as never;
          return { kind: "committed", value: undefined, snapshot };
        },
      } as never,
      sha256,
      clock: { nowEpochMilliseconds: () => 86_400_001, monotonicMilliseconds: () => 0 },
    });
    const result = await service.collect({ policy: { unreferencedGraceMs: 86_400_000 } }, signal);
    expect(result).toMatchObject({ kind: "collected", prunedRevisions: 1, removedArtifacts: 1 });
    expect(removed).toBe(1);
  });
});
