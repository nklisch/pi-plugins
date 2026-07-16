import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createMarketplaceRefreshService, type MarketplaceRefreshServiceDependencies } from "../../src/application/marketplace-refresh-service.js";
import { createContentManifest, createMaterializationBinding } from "../../src/domain/content-manifest.js";
import { createResolvedMarketplaceSource } from "../../src/domain/source.js";
import {
  createMarketplaceConfigurationRecord,
  deriveMarketplaceSourceIdentity,
  derivePluginSourceIdentity,
  deriveUpdateCandidateKey,
} from "../../src/domain/update-policy.js";
import { readClaudeMarketplace } from "../../src/formats/claude/marketplace-reader.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const digest = (value: string) => `sha256:${value.repeat(64 / value.length)}` as any;
const marketplace = { kind: "github" as const, repository: "example/community" };
const scope = { kind: "user" as const };

type FakeSnapshot = Readonly<{
  scope: typeof scope;
  generation: number;
  config: Readonly<{ schemaVersion: 2; generation: number; records: readonly ReturnType<typeof createMarketplaceConfigurationRecord>[] }>;
}>;

function makeEnvironment(options: Readonly<{
  automatic: boolean;
  pluginCount?: number;
  movedRevision?: boolean;
  complete?: boolean;
  inventory?: { discover(signal: AbortSignal): Promise<{ scopes: ReadonlyArray<typeof scope>; complete: boolean }> };
}> = { automatic: false }) {
  const content = createContentManifest([], sha256);
  const source = createResolvedMarketplaceSource({ declared: marketplace, revision: "a".repeat(40) }, sha256);
  const binding = createMaterializationBinding(source.hash, content.rootDigest, sha256);
  const materialized = { root: "/virtual/marketplace", source, content, binding };
  const catalog = readClaudeMarketplace({
    name: "community",
    plugins: [
      { name: "first", source: "./first", strict: false },
      ...(options.pluginCount === 2 ? [{ name: "second", source: "./second", strict: false }] : []),
    ],
  });
  const entries = catalog.marketplace.entries;
  const marketplaceSourceIdentity = deriveMarketplaceSourceIdentity(marketplace, sha256);
  const pluginSourceIdentity = derivePluginSourceIdentity(entries[0]!.source.value, sha256);
  const availableRevision = digest("b");
  const probes = entries.map((entry, index) => {
    const plugin = `${index === 0 ? "first" : "second"}@community` as const;
    const candidate = deriveUpdateCandidateKey({
      scope,
      plugin,
      marketplaceSourceIdentity,
      pluginSourceIdentity,
      immutableRevision: availableRevision,
    }, sha256);
    return {
      plugin,
      entry,
      available: {
        immutableRevision: availableRevision,
        marketplaceSourceIdentity,
        pluginSourceIdentity,
        declaredVersion: "1.1.0",
        sourceRevision: "b".repeat(40),
      },
      candidate,
      display: { installed: "1.0.0", available: "1.1.0" },
    };
  });
  const record = createMarketplaceConfigurationRecord({
    marketplace: "community",
    source: marketplace,
    updateApplication: options.automatic ? "automatic" : "manual",
  });
  let current: FakeSnapshot = {
    scope,
    generation: 0,
    config: { schemaVersion: 2, generation: 0, records: [record] },
  };
  let queue = Promise.resolve();
  let claimSequence = 0;
  let lifecycleCalls = 0;
  const state = {
    async read() { return { ok: true as const, snapshot: current }; },
  };
  const mutations = {
    async runPreparedMutation(request: { expectedGeneration: number }, prepare: (context: { snapshot: FakeSnapshot; assertOwned(): Promise<void> }) => Promise<{ mutation: any; value: unknown }>) {
      let release!: () => void;
      const previous = queue;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        if (request.expectedGeneration !== current.generation) return { kind: "stale-generation" as const, expected: request.expectedGeneration, actual: current.generation };
        const prepared = await prepare({ snapshot: current, assertOwned: async () => undefined });
        const config = prepared.mutation.replace.config;
        current = {
          ...current,
          generation: current.generation + 1,
          config: { ...config, generation: current.generation + 1 },
        };
        return { kind: "committed" as const, value: prepared.value, snapshot: current as any };
      } finally {
        release();
      }
    },
  };
  const dependencies = {
    inventory: options.inventory ?? { async discover() { return { scopes: [scope], complete: options.complete ?? true }; } },
    state,
    mutations,
    clock: { nowEpochMilliseconds: () => 1_000, monotonicMilliseconds: () => 1_000 },
    claimIds: { async create() { claimSequence += 1; return `refresh-claim-v1:uuid:123e4567-e89b-42d3-a456-42661417400${claimSequence}`; } },
    materializers: { marketplaces: { async materialize() { return materialized; } } },
    inspection: { async inspect() { return catalog; } },
    content: {
      async allocateStaging() { return { slot: { root: "/virtual/stage" }, allocationId: "stage" }; },
      async discardStaging() {},
      async promote(plan: any) { return { kind: "promoted" as const, identity: plan.identity, root: "/virtual/store", manifest: plan.manifest }; },
    },
    sha256,
    probe: async () => probes,
    lifecycle: {
      async update() {
        lifecycleCalls += 1;
        if (options.pluginCount === 2 && lifecycleCalls === 2) throw new Error("later plugin failed");
        if (options.movedRevision) return { kind: "rejected", operation: "update", code: "AVAILABLE_REVISION_CHANGED" };

        return { kind: "changed" as const } as any;
      },
    },
  } as unknown as MarketplaceRefreshServiceDependencies;
  return { dependencies, service: createMarketplaceRefreshService(dependencies), state: () => current, get lifecycleCalls() { return lifecycleCalls; } };
}

describe("marketplace update policy integration", () => {
  it("coalesces two sessions and emits one manual intent without invoking lifecycle", async () => {
    const shared = makeEnvironment();
    const serviceA = shared.service;
    const serviceB = createMarketplaceRefreshService(shared.dependencies);
    const [left, right] = await Promise.all([
      serviceA.refresh({ trigger: "explicit" }, new AbortController().signal),
      serviceB.refresh({ trigger: "explicit" }, new AbortController().signal),
    ]);
    const intents = [...left.notifications, ...right.notifications];
    expect(intents).toHaveLength(1);
    expect(shared.lifecycleCalls).toBe(0);

    // The emitted phase is durable in shared state, so a later explicit pass
    // does not produce a second application-level intent.
    const later = await serviceA.refresh({ trigger: "explicit" }, new AbortController().signal);
    expect(later.notifications).toHaveLength(0);
  });

  it("keeps inventory completeness local to each concurrent invocation", async () => {
    let calls = 0;
    let releaseFirst!: () => void;
    const firstDiscovery = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const inventory = {
      async discover() {
        calls += 1;
        if (calls === 1) {
          await firstDiscovery;
          return { scopes: [scope], complete: false };
        }
        return { scopes: [scope], complete: true };
      },
    };
    const environment = makeEnvironment({ automatic: true, inventory });
    const first = environment.service.refresh({ trigger: "explicit" }, new AbortController().signal);
    while (calls < 1) await Promise.resolve();
    const second = await environment.service.refresh({ trigger: "explicit" }, new AbortController().signal);
    releaseFirst();
    await first;
    expect(second.notifications).toHaveLength(1);
    expect(environment.lifecycleCalls).toBe(1);
  });

  it("keeps a moved revision retryable without losing the discovery intent", async () => {
    const environment = makeEnvironment({ automatic: true, movedRevision: true });
    const result = await environment.service.refresh({ trigger: "explicit" }, new AbortController().signal);
    expect(environment.lifecycleCalls).toBe(1);
    expect(result.notifications).toMatchObject([{ plugin: "first@community", disposition: "automatic-retryable" }]);
  });

  it("routes automatic application through lifecycle and keeps earlier intents when a later plugin throws", async () => {
    const environment = makeEnvironment({ automatic: true, pluginCount: 2 });
    const result = await environment.service.refresh({ trigger: "explicit" }, new AbortController().signal);
    expect(environment.lifecycleCalls).toBe(2);
    expect(result.notifications).toHaveLength(2);
    expect(result.notifications[0]?.plugin).toBe("first@community");
    expect(result.notifications[1]?.disposition).toBe("automatic-retryable");
  });
});
