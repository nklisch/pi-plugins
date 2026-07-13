import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPluginLifecycleService, type PluginLifecycleServiceDependencies } from "../../src/application/plugin-lifecycle-service.js";
import { prepareEnableCandidate } from "../../src/application/plugin-candidate-preparation.js";
import { createMaterializationBinding, createContentManifest } from "../../src/domain/content-manifest.js";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { NormalizedPluginSchema } from "../../src/domain/plugin.js";
import { claim } from "../../src/domain/provenance.js";
import { createResolvedMarketplaceSource, createResolvedPluginSource } from "../../src/domain/source.js";
import {
  createInstalledUserStateDocument,
  createMarketplaceSnapshotRecord,
  createInstalledPluginRecord,
  createInstalledRevisionRecord,
} from "../../src/domain/state/installed-state.js";
import { HostConfigDocumentSchemaV1, GenerationSchema, type Generation } from "../../src/domain/state/config-state.js";
import { StatePointersDocumentSchemaV1 } from "../../src/domain/state/pointers.js";
import { TrustStateDocumentSchemaV1 } from "../../src/domain/state/trust-state.js";
import { deriveStateBlobRef } from "../../src/domain/state/references.js";
import { grantTrust, createTrustCandidate } from "../../src/domain/trust-policy.js";
import type { GenerationSnapshot } from "../../src/application/state-contract.js";
import type { LifecycleStateStore } from "../../src/application/ports/lifecycle-state-store.js";
import type { GenerationMutationCoordinator } from "../../src/application/generation-mutation-coordinator.js";
import type { RuntimeProjectionPort, ProjectionExpectation } from "../../src/application/ports/runtime-projection.js";
import type { LifecycleReloadPort } from "../../src/application/ports/lifecycle-reload.js";
import type { LifecycleTransitionStore } from "../../src/application/ports/lifecycle-transition-store.js";
import { readClaudeMarketplace } from "../../src/formats/claude/marketplace-reader.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const signal = new AbortController().signal;
const projectRevision = "b".repeat(40);
const marketplaceSource = createResolvedMarketplaceSource({ declared: { kind: "github", repository: "example/community" }, revision: projectRevision }, sha256);
const entry = readClaudeMarketplace({ name: "community", plugins: [{ name: "fixture", source: "./plugin", strict: false }] }).marketplace.entries[0]!;
const pluginSourcePath = entry.source.value.kind === "marketplace-path" ? entry.source.value.path : "plugin";
const plugin = NormalizedPluginSchema.parse({
  identity: { key: "fixture@community", marketplaceName: "community", marketplaceEntryName: "fixture" },
  source: createResolvedPluginSource({ kind: "marketplace-path", marketplaceRevision: projectRevision, path: pluginSourcePath }, sha256),
  configuration: { options: [] },
  components: { skills: [], hooks: [], mcpServers: [], foreign: [] },
  metadata: [],
});
const compatibility = CompatibilityReportSchema.parse({ plugin: plugin.identity, activatable: true, components: [], requirements: [], diagnostics: [] });
const content = createContentManifest([], sha256);
const binding = createMaterializationBinding(plugin.source.hash, content.rootDigest, sha256);
const materialized = { root: "/virtual/plugin", source: plugin.source, content, binding };
const marketplace = createMarketplaceSnapshotRecord({ marketplace: "community", source: marketplaceSource, content }, sha256);
const revision = createInstalledRevisionRecord({ plugin, compatibility, content, scope: { kind: "user" } }, sha256);
const trustCandidate = createTrustCandidate({ scope: { kind: "user" }, marketplaceSource, plugin, compatibility, content, materializationBinding: binding }, sha256);
const trust = grantTrust(trustCandidate, sha256);

function pointers(generation: Generation) {
  return StatePointersDocumentSchemaV1.parse({
    schemaVersion: 1,
    scope: { kind: "user" },
    generation,
    documents: ["hostConfig", "installedUser", "trust"].map((kind) => ({
      kind,
      generation,
      blob: deriveStateBlobRef({ document: kind, scope: "user", generation }, sha256),
      digest: `sha256:${"0".repeat(64)}`,
    })),
  });
}

function snapshot(generation: number, installed: ReturnType<typeof createInstalledUserStateDocument>["plugins"] = [], records = [trust]): Extract<GenerationSnapshot, { scope: { kind: "user" } }> {
  const value = GenerationSchema.parse(generation);
  return {
    scope: { kind: "user" },
    generation: value,
    pointers: pointers(value),
    config: HostConfigDocumentSchemaV1.parse({ schemaVersion: 1, generation: value, records: [] }),
    installed: createInstalledUserStateDocument({ generation: value, marketplaces: [marketplace], plugins: installed }, sha256),
    trust: TrustStateDocumentSchemaV1.parse({ schemaVersion: 1, generation: value, records }),
    corruptions: [],
  };
}

class MemoryState implements LifecycleStateStore {
  constructor(public current: Extract<GenerationSnapshot, { scope: { kind: "user" } }>) {}
  async read() { return { ok: true as const, snapshot: this.current }; }
  async commit() { throw new Error("the coordinator owns commits in this fixture"); }
}

function nextSnapshot(current: Extract<GenerationSnapshot, { scope: { kind: "user" } }>, mutation: { replace: { installed?: ReturnType<typeof createInstalledUserStateDocument> } }) {
  const generation = GenerationSchema.parse(current.generation + 1);
  const installed = mutation.replace.installed === undefined
    ? { ...current.installed, generation }
    : { ...mutation.replace.installed, generation };
  return {
    ...current,
    generation,
    pointers: pointers(generation),
    config: { ...current.config, generation },
    installed,
    trust: { ...current.trust, generation },
  };
}

function fakeCoordinator(state: MemoryState): GenerationMutationCoordinator {
  return {
    async runPreparedMutation(request, callback) {
      if (request.expectedGeneration !== state.current.generation) return { kind: "stale-generation", expected: request.expectedGeneration, actual: state.current.generation };
      const prepared = await callback({ snapshot: state.current, assertOwned: async () => undefined });
      state.current = nextSnapshot(state.current, prepared.mutation as unknown as { replace: { installed?: ReturnType<typeof createInstalledUserStateDocument> } });
      return { kind: "committed", value: prepared.value, snapshot: state.current };
    },
  };
}

function dependencies(state: MemoryState, options: Readonly<{ rejectReload?: boolean }> = {}): PluginLifecycleServiceDependencies {
  const expectations: ProjectionExpectation[] = [];
  let reloadCount = 0;
  const projections: RuntimeProjectionPort = {
    async prepare(value) { expectations.push(value); return value; },
  };
  const reload: LifecycleReloadPort = {
    async reload() {
      reloadCount += 1;
      if (options.rejectReload && reloadCount === 1) return { kind: "failed", code: "adapter-error" };
      return { kind: "accepted" };
    },
    async observe() {
      const current = state.current.installed.plugins.find((record) => record.plugin === plugin.identity.key);
      const expectation = current?.activation === "enabled"
        ? [...expectations].reverse().find((value) => value.kind === "active")
        : [...expectations].reverse().find((value) => value.kind === "inactive");
      if (expectation?.kind === "active") return { kind: "active", scope: expectation.projection.scope, plugin: expectation.projection.plugin, revision: expectation.projection.revision, projectionDigest: expectation.projection.digest };
      return { kind: "inactive", scope: expectation?.kind === "inactive" ? expectation.scope : { kind: "user" }, plugin: plugin.identity.key };
    },
  };
  const transitions: LifecycleTransitionStore = {
    async prepare() { return "stored"; },
    async settle() { return undefined; },
  };
  const contentPort = {
    async allocateStaging() { return { slot: { root: "/virtual/stage" }, allocationId: "stage" }; },
    async discardStaging() { return undefined; },
    async promote(plan: any) { return { kind: "promoted" as const, identity: plan.identity, root: "/virtual/store", manifest: plan.manifest }; },
  };
  const base = {
    state,
    mutations: fakeCoordinator(state),
    content: contentPort,
    materializer: { async materialize() { return materialized; } },
    inspector: { async inspect() { return { ok: true as const, value: plugin, diagnostics: [] }; } },
    compatibility: { async assess() { return compatibility; } },
    installed: { async load() { return { plugin, compatibility, marketplaceSource, content, binding }; } },
    projections,
    reload,
    transitions,
    operationIds: { async create() { return "00000000-0000-4000-8000-000000000001"; } },
    projectTrust: { async assess() { return { kind: "trusted" as const }; } },
    configurations: { async read() { return { kind: "missing" as const }; }, async replace() { return { kind: "stored" as const }; }, async remove() { return "missing" as const; } },
    secrets: { async put() { return { kind: "collision" as const }; }, async get() { return { kind: "missing" as const }; }, async remove() { return "missing" as const; }, async removeOwned() { return "missing" as const; } },
    paths: { async normalizeAndInspect() { return { kind: "missing" as const }; } },
    sha256,
  } satisfies PluginLifecycleServiceDependencies;
  return base;
}

const installRequest = {
  scope: { kind: "user" as const },
  plugin: plugin.identity.key,
  entry,
  marketplaceSource,
  sourceContext: { kind: "marketplace" as const, root: "/virtual/marketplace", source: marketplaceSource, contentRootDigest: content.rootDigest, content, binding: createMaterializationBinding(marketplaceSource.hash, content.rootDigest, sha256) },
  configurationPathContext: { scope: { kind: "user" as const } },
};

describe("plugin lifecycle service", () => {
  it("keeps idempotent missing and disabled operations deterministic", async () => {
    const missing = new MemoryState(snapshot(0, []));
    const service = createPluginLifecycleService(dependencies(missing));
    expect(await service.uninstall({ scope: { kind: "user" }, plugin: plugin.identity.key }, signal)).toMatchObject({ kind: "unchanged", operation: "uninstall" });
    expect(await service.disable({ scope: { kind: "user" }, plugin: plugin.identity.key }, signal)).toMatchObject({ kind: "rejected", code: "NOT_INSTALLED" });
  });

  it("runs one whole-plugin path through install, disable, enable, and uninstall", async () => {
    const state = new MemoryState(snapshot(0, []));
    const service = createPluginLifecycleService(dependencies(state));
    const installed = await service.install(installRequest, signal);
    expect(installed.kind).toBe("changed");
    expect(state.current.installed.plugins[0]?.activation).toBe("enabled");
    const disabled = await service.disable({ scope: { kind: "user" }, plugin: plugin.identity.key }, signal);
    expect(disabled.kind).toBe("changed");
    expect(state.current.installed.plugins[0]?.activation).toBe("disabled");
    const enabledRequest = { scope: { kind: "user" as const }, plugin: plugin.identity.key, configurationPathContext: { scope: { kind: "user" as const } } };
    const directEnable = await prepareEnableCandidate(dependencies(state), { operation: "enable", scope: enabledRequest.scope, installed: state.current.installed.plugins[0]!, trustRecords: [trust], configurationPathContext: enabledRequest.configurationPathContext }, signal);
    expect(directEnable.kind).toBe("prepared");
    const enabled = await service.enable(enabledRequest, signal);
    expect(enabled.kind).toBe("changed");
    const updated = await service.update(installRequest, signal);
    expect(updated).toMatchObject({ kind: "unchanged", operation: "update" });
    const removed = await service.uninstall({ scope: { kind: "user" }, plugin: plugin.identity.key, retainedData: "delete-confirmed" }, signal);
    expect(removed.kind).toBe("changed");
    expect(removed).toMatchObject({ cleanup: { kind: "deferred", retainedData: "delete-confirmed" } });
    expect(state.current.installed.plugins).toHaveLength(0);
  });

  it("reports verified rollback instead of accepting a rejected reload", async () => {
    const state = new MemoryState(snapshot(0, [createInstalledPluginRecord({ plugin: plugin.identity.key, activation: "enabled", revisions: [{ plugin, compatibility, content }] }, sha256)]));
    const service = createPluginLifecycleService(dependencies(state, { rejectReload: true }));
    const result = await service.disable({ scope: { kind: "user" }, plugin: plugin.identity.key }, signal);
    expect(result.kind).toBe("rolled-back");
    expect(state.current.installed.plugins[0]?.activation).toBe("enabled");
  });
});
