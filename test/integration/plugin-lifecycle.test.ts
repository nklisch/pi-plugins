import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { claim } from "../../src/domain/provenance.js";
import { CompatibilityReportSchema } from "../../src/domain/compatibility.js";
import { createContentManifest, createMaterializationBinding } from "../../src/domain/content-manifest.js";
import { NormalizedPluginSchema, type NormalizedPlugin } from "../../src/domain/plugin.js";
import { createResolvedPluginSource, createResolvedMarketplaceSource } from "../../src/domain/source.js";
import {
  createInstalledRevisionRecord,
  createInstalledUserStateDocument,
  createMarketplaceSnapshotRecord,
} from "../../src/domain/state/installed-state.js";
import { createProjectLocalStateDocument } from "../../src/domain/state/project-state.js";
import { HostConfigDocumentSchemaV1, GenerationSchema, type Generation } from "../../src/domain/state/config-state.js";
import { StatePointersDocumentSchemaV1 } from "../../src/domain/state/pointers.js";
import { TrustStateDocumentSchemaV1 } from "../../src/domain/state/trust-state.js";
import { deriveStateBlobRef } from "../../src/domain/state/references.js";
import {
  CanonicalProjectRootSchema,
  ProjectIdentitySchema,
  createScopeContext,
  deriveProjectKey,
  toScopeReference,
  type ScopeContext,
} from "../../src/domain/state/scope.js";
import { createProjectRootAuthorityPort } from "../../src/composition/create-project-root-authority.js";
import { readClaudeMarketplace } from "../../src/formats/claude/marketplace-reader.js";
import type { CompatibilityReport } from "../../src/domain/compatibility.js";
import type { ContentManifest } from "../../src/domain/content-manifest.js";
import {
  createPluginRuntimeProjection,
  createActiveProjectionExpectation,
  type ProjectionExpectation,
  type RuntimeProjectionPort,
} from "../../src/application/ports/runtime-projection.js";
import { createPluginLifecycleService, type PluginLifecycleServiceDependencies } from "../../src/application/plugin-lifecycle-service.js";
import type { GenerationMutationCoordinator } from "../../src/application/generation-mutation-coordinator.js";
import type { LifecycleStateStore } from "../../src/application/ports/lifecycle-state-store.js";
import { CurrentProjectRuntimeContextSchema } from "../../src/application/ports/project-trust.js";
import type { LifecycleReloadPort } from "../../src/application/ports/lifecycle-reload.js";
import type { LifecycleTransitionStore } from "../../src/application/ports/lifecycle-transition-store.js";
import type { ContentStorePort } from "../../src/application/ports/content-store.js";
import type { InstalledPluginLoader } from "../../src/application/ports/installed-plugin-loader.js";
import type { ProjectRootAuthorityPort } from "../../src/application/ports/project-root-authority.js";
import type { GenerationSnapshot } from "../../src/application/state-contract.js";
import { createTrustCandidate, grantTrust } from "../../src/domain/trust-policy.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());
const provenance = { location: { host: "claude" as const, documentKind: "manifest" as const, path: "plugin.json", pointer: "/components" } };
const id = (kind: string, token: string) => `component-v1:${kind}:${token.repeat(64).slice(0, 64)}`;

const plugin = NormalizedPluginSchema.parse({
  identity: { key: "bundle@community", marketplaceName: "community", marketplaceEntryName: "bundle" },
  source: createResolvedPluginSource({ kind: "git", url: "https://example.invalid/bundle.git", revision: "c".repeat(40) }, sha256),
  configuration: { options: [] },
  components: {
    skills: [{ kind: "skill", id: id("skill", "1"), name: claim("bundle-skill", provenance), root: claim("skills/bundle", provenance), metadata: [] }],
    hooks: [{ kind: "hook", id: id("hook", "2"), event: claim("SessionStart", provenance), handler: claim({ kind: "shell", command: "echo ready" }, provenance), metadata: [] }],
    mcpServers: [{ kind: "mcp-server", id: id("mcp-server", "3"), nativeKey: claim("bundle", provenance), declaration: claim({ transport: "stdio", command: "bundle-mcp" }, provenance), metadata: [] }],
    foreign: [],
  },
  metadata: [],
});
const componentIds = [plugin.components.skills[0]!.id, plugin.components.hooks[0]!.id, plugin.components.mcpServers[0]!.id];
const compatibility = CompatibilityReportSchema.parse({
  plugin: plugin.identity,
  activatable: true,
  components: componentIds.map((componentId) => ({ componentId, verdict: { kind: "supported" }, requirementIds: [], diagnostics: [] })),
  requirements: [],
  diagnostics: [],
});
const content = createContentManifest([], sha256);

function revision(scope: { kind: "user" } | { kind: "project"; projectKey: string }) {
  return createInstalledRevisionRecord({ plugin, compatibility, content, scope }, sha256);
}

describe("whole-plugin lifecycle integration contracts", () => {
  it("projects one skill, hook, and MCP bundle through one complete runtime seam", () => {
    const projection = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision: revision({ kind: "user" }), sha256 });
    expect(projection.components.skills).toHaveLength(1);
    expect(projection.components.hooks).toHaveLength(1);
    expect(projection.components.mcpServers).toHaveLength(1);
    expect(createActiveProjectionExpectation(projection, sha256).kind).toBe("active");
    expect(JSON.stringify(projection)).not.toContain("example.invalid");
    expect(JSON.stringify(projection)).not.toContain("file://");
  });

  it("keeps identical plugin keys isolated by scope-qualified immutable references", () => {
    const user = createPluginRuntimeProjection({ scope: { kind: "user" }, plugin, compatibility, revision: revision({ kind: "user" }), sha256 });
    const project = createPluginRuntimeProjection({ scope: { kind: "project", projectKey: `project-v1:sha256:${"a".repeat(64)}` }, plugin, compatibility, revision: revision({ kind: "project", projectKey: `project-v1:sha256:${"a".repeat(64)}` }), sha256 });
    expect(user.plugin).toBe(project.plugin);
    expect(user.digest).not.toBe(project.digest);
    expect(user.dataRef).not.toBe(project.dataRef);
  });
});

const lifecycleEntry = readClaudeMarketplace({
  name: "community",
  plugins: [{ name: "bundle", source: "./plugin", strict: false }],
}).marketplace.entries[0]!;
const lifecycleMarketplace = createResolvedMarketplaceSource({
  declared: { kind: "github", repository: "example/community" },
  revision: "a".repeat(40),
}, sha256);
const lifecyclePluginV2 = NormalizedPluginSchema.parse({
  ...plugin,
  source: createResolvedPluginSource({
    kind: "git",
    url: "https://example.invalid/bundle.git",
    revision: "d".repeat(40),
  }, sha256),
});
const lifecycleCompatibilityV2 = CompatibilityReportSchema.parse({
  ...compatibility,
  plugin: lifecyclePluginV2.identity,
});
const lifecycleProjectRoot = CanonicalProjectRootSchema.parse("file:///workspace/project/");
const lifecycleProjectIdentity = ProjectIdentitySchema.parse({
  kind: "path-only",
  canonicalRoot: lifecycleProjectRoot,
  limitation: "identity-changes-with-canonical-root",
});
const lifecycleProject = createScopeContext({
  kind: "project",
  identity: lifecycleProjectIdentity,
  projectKey: deriveProjectKey(lifecycleProjectIdentity, sha256),
}, sha256);
const currentProject = CurrentProjectRuntimeContextSchema.parse({
  identity: lifecycleProjectIdentity,
  projectKey: lifecycleProject.projectKey,
  trust: { kind: "trusted" },
});

function lifecyclePointers(scope: ScopeContext, generation: Generation) {
  const reference = toScopeReference(scope);
  const kinds = scope.kind === "user" ? ["hostConfig", "installedUser", "trust"] : ["projectLocal"];
  return StatePointersDocumentSchemaV1.parse({
    schemaVersion: 1,
    scope: reference,
    generation,
    documents: kinds.map((kind) => ({
      kind,
      generation,
      blob: deriveStateBlobRef({ document: kind, scope: reference, generation }, sha256),
      digest: content.rootDigest,
    })),
  });
}

function lifecycleUserSnapshot(
  generation: number,
  plugins: ReadonlyArray<ReturnType<typeof createInstalledUserStateDocument>["plugins"][number]> = [],
  records: ReadonlyArray<ReturnType<typeof grantTrust>> = [],
): Extract<GenerationSnapshot, { scope: { kind: "user" } }> {
  const value = GenerationSchema.parse(generation);
  return {
    scope: { kind: "user" },
    generation: value,
    pointers: lifecyclePointers({ kind: "user" }, value),
    config: HostConfigDocumentSchemaV1.parse({ schemaVersion: 1, generation: value, records: [] }),
    installed: createInstalledUserStateDocument({ generation: value, marketplaces: [createMarketplaceSnapshotRecord({ marketplace: "community", source: lifecycleMarketplace, content }, sha256)], plugins }, sha256),
    trust: TrustStateDocumentSchemaV1.parse({ schemaVersion: 1, generation: value, records }),
    corruptions: [],
  };
}

function lifecycleProjectSnapshot(
  generation: number,
): Extract<GenerationSnapshot, { scope: { kind: "project" } }> {
  const value = GenerationSchema.parse(generation);
  const marketplace = createMarketplaceSnapshotRecord({ marketplace: "community", source: lifecycleMarketplace, content }, sha256);
  return {
    scope: lifecycleProject,
    generation: value,
    pointers: lifecyclePointers(lifecycleProject, value),
    project: createProjectLocalStateDocument({
      schemaVersion: 1,
      generation: value,
      projectKey: lifecycleProject.projectKey,
      identity: lifecycleProject.identity,
      declarationDigest: content.rootDigest,
      marketplaces: [marketplace],
      plugins: [],
    }, lifecycleProject, sha256),
    corruptions: [],
  };
}

class LifecycleScopeState implements LifecycleStateStore {
  private readonly values = new Map<string, GenerationSnapshot>();

  constructor(user: GenerationSnapshot, project: GenerationSnapshot) {
    this.values.set("user", user);
    this.values.set(`project:${project.scope.kind === "project" ? project.scope.projectKey : ""}`, project);
  }

  get(scope: ScopeContext): GenerationSnapshot {
    const value = this.values.get(scope.kind === "user" ? "user" : `project:${scope.projectKey}`);
    if (value === undefined) throw new Error("missing lifecycle test scope");
    return value;
  }

  set(snapshot: GenerationSnapshot): void {
    this.values.set(snapshot.scope.kind === "user" ? "user" : `project:${snapshot.scope.projectKey}`, snapshot);
  }

  async read(scope: ScopeContext) {
    return { ok: true as const, snapshot: this.get(scope) };
  }

  async commit(): Promise<never> {
    throw new Error("the generation coordinator owns lifecycle test commits");
  }
}

function createLifecycleCoordinator(state: LifecycleScopeState): GenerationMutationCoordinator {
  return {
    async runPreparedMutation(request, callback) {
      const current = state.get(request.scope);
      if (request.expectedGeneration !== current.generation) {
        return { kind: "stale-generation", expected: request.expectedGeneration, actual: current.generation };
      }
      const prepared = await callback({ snapshot: current, assertOwned: async () => undefined });
      const generation = GenerationSchema.parse(current.generation + 1);
      let next: GenerationSnapshot;
      if (current.scope.kind === "user" && prepared.mutation.scope.kind === "user") {
        const replacement = prepared.mutation.replace;
        const installed = "installed" in replacement && replacement.installed !== undefined
          ? { ...replacement.installed, generation }
          : { ...current.installed, generation };
        const config = "config" in replacement && replacement.config !== undefined
          ? { ...replacement.config, generation }
          : { ...current.config, generation };
        const trust = "trust" in replacement && replacement.trust !== undefined
          ? { ...replacement.trust, generation }
          : { ...current.trust, generation };
        next = { ...current, generation, pointers: lifecyclePointers(current.scope, generation), config, installed, trust };
      } else if (current.scope.kind === "project" && prepared.mutation.scope.kind === "project") {
        next = {
          ...current,
          generation,
          pointers: lifecyclePointers(current.scope, generation),
          project: { ...prepared.mutation.replace.project, generation },
        };
      } else {
        throw new Error("lifecycle test mutation scope mismatch");
      }
      state.set(next);
      return { kind: "committed", value: prepared.value, snapshot: next };
    },
  };
}

function lifecycleTrust(
  scope: ScopeContext,
  candidatePlugin: NormalizedPlugin,
  candidateCompatibility: CompatibilityReport,
) {
  return grantTrust(createTrustCandidate({
    scope: toScopeReference(scope),
    marketplaceSource: lifecycleMarketplace,
    plugin: candidatePlugin,
    compatibility: candidateCompatibility,
    content,
    materializationBinding: createMaterializationBinding(candidatePlugin.source.hash, content.rootDigest, sha256),
  }, sha256), sha256);
}

describe("project-scoped lifecycle service wiring", () => {
  it("installs, disables, enables, updates, and uninstalls a complete project bundle without crossing user state", async () => {
    const userTrust = lifecycleTrust({ kind: "user" }, plugin, compatibility);
    const projectTrustV1 = lifecycleTrust(lifecycleProject, plugin, compatibility);
    const projectTrustV2 = lifecycleTrust(lifecycleProject, lifecyclePluginV2, lifecycleCompatibilityV2);
    const state = new LifecycleScopeState(
      lifecycleUserSnapshot(0, [], [userTrust]),
      lifecycleProjectSnapshot(0),
    );
    const rootPort = createProjectRootAuthorityPort({ resolve: async () => lifecycleProject }, sha256);
    let rootAcquireCalls = 0;
    let rootVerifyCalls = 0;
    let rootAuthorityAvailable = true;
    const projectRoots: ProjectRootAuthorityPort = {
      async acquire(signal) {
        rootAcquireCalls += 1;
        if (!rootAuthorityAvailable) throw new Error("project root authority unavailable");
        return rootPort.acquire(signal);
      },
      verify(capability, scope) {
        rootVerifyCalls += 1;
        return rootPort.verify(capability, scope);
      },
    };
    const trustCalls: string[] = [];
    const expectations: ProjectionExpectation[] = [];
    const reloads: string[] = [];
    const projections: RuntimeProjectionPort = {
      async prepare(expectation) {
        expectations.push(expectation);
        return expectation;
      },
    };
    const reload: LifecycleReloadPort = {
      async reload(request) {
        reloads.push(request.scope.kind === "user" ? "user" : request.scope.projectKey);
        return { kind: "accepted" };
      },
      async observe(request) {
        const current = state.get(request.scope.kind === "user" ? { kind: "user" } : lifecycleProject);
        const currentRecord = current.scope.kind === "user"
          ? current.installed.plugins.find((record) => record.plugin === request.plugin)
          : current.project.plugins.find((record) => record.plugin === request.plugin);
        const active = currentRecord?.activation === "enabled";
        const expected = [...expectations].reverse().find((value) =>
          value.kind === (active ? "active" : "inactive") &&
          JSON.stringify(value.kind === "active" ? value.projection.scope : value.scope) === JSON.stringify(request.scope) &&
          (value.kind === "active" ? value.projection.plugin : value.plugin) === request.plugin &&
          (value.kind === "inactive" || value.projection.revision === currentRecord?.selectedRevision),
        );
        if (expected === undefined) throw new Error("lifecycle test observation has no prepared expectation");
        return expected.kind === "active"
          ? { kind: "active", scope: expected.projection.scope, plugin: expected.projection.plugin, revision: expected.projection.revision, projectionDigest: expected.projection.digest, currentProject }
          : { kind: "inactive", scope: expected.scope, plugin: expected.plugin, projectionDigest: expected.digest, currentProject };
      },
    };
    let materializationCount = 0;
    const materializer = {
      async materialize() {
        const selected = materializationCount++ < 2 ? plugin : lifecyclePluginV2;
        return {
          root: "/virtual/plugin",
          source: selected.source,
          content,
          binding: createMaterializationBinding(selected.source.hash, content.rootDigest, sha256),
        };
      },
    };
    const contentPort = {
      async allocateStaging() { return { slot: { root: "/virtual/stage" }, allocationId: `stage-${materializationCount}` }; },
      async discardStaging() { return undefined; },
      async promote(plan: { identity: unknown; manifest: ContentManifest }) { return { kind: "promoted" as const, identity: plan.identity as never, root: "/virtual/store", manifest: plan.manifest }; },
    } as unknown as ContentStorePort;
    const loader: InstalledPluginLoader = {
      async load({ revision }) {
        const selected = revision.evidence.source.kind === "git" && revision.evidence.source.revision === "d".repeat(40)
          ? lifecyclePluginV2
          : plugin;
        return { plugin: selected, compatibility: selected === lifecyclePluginV2 ? lifecycleCompatibilityV2 : compatibility, marketplaceSource: lifecycleMarketplace, content, binding: revision.revision };
      },
    };
    let operationCounter = 0;
    const dependencies = {
      state,
      mutations: createLifecycleCoordinator(state),
      content: contentPort,
      materializer,
      inspector: { async inspect(input: { materialized: { source: { revision?: string } } }) { return { ok: true as const, value: input.materialized.source.revision === "d".repeat(40) ? lifecyclePluginV2 : plugin, diagnostics: [] }; } },
      compatibility: { async assess(input: { plugin: NormalizedPlugin }) { return input.plugin === lifecyclePluginV2 ? lifecycleCompatibilityV2 : compatibility; } },
      installed: loader,
      projections,
      reload,
      transitions: { async prepare() { return "stored" as const; }, async settle() { return undefined; } } satisfies LifecycleTransitionStore,
      operationIds: { async create() { operationCounter += 1; return `00000000-0000-4000-8000-${operationCounter.toString(16).padStart(12, "0")}`; } },
      projectTrust: { async assess(projectKey: string) { trustCalls.push(projectKey); return { kind: "trusted" as const }; } },
      projectRoots,
      configurations: { async read() { return { kind: "missing" as const }; }, async replace() { return { kind: "stored" as const }; }, async remove() { return "missing" as const; } },
      secrets: { async put() { return { kind: "collision" as const }; }, async get() { return { kind: "missing" as const }; }, async remove() { return "missing" as const; }, async removeOwned() { return "missing" as const; } },
      paths: { async normalizeAndInspect() { return { kind: "missing" as const }; } },
      sha256,
    } as unknown as PluginLifecycleServiceDependencies;
    const service = createPluginLifecycleService(dependencies);
    const userRequest = {
      scope: { kind: "user" as const },
      plugin: plugin.identity.key,
      entry: lifecycleEntry,
      marketplaceSource: lifecycleMarketplace,
      sourceContext: { kind: "external" as const },
      trustRecords: [userTrust],
      configurationPathContext: { scope: { kind: "user" as const }, trustedBaseDirectory: "/virtual" },
    };
    expect((await service.install(userRequest, new AbortController().signal)).kind).toBe("changed");
    expect(rootAcquireCalls).toBe(0);
    expect(rootVerifyCalls).toBe(0);
    expect(trustCalls).toEqual([]);

    const projectRequest = {
      ...userRequest,
      scope: lifecycleProject,
      sourceContext: { kind: "external" as const },
      trustRecords: [projectTrustV1, projectTrustV2],
      configurationPathContext: { scope: lifecycleProject },
    };
    expect((await service.install(projectRequest, new AbortController().signal)).kind).toBe("changed");
    expect((await service.disable({ scope: lifecycleProject, plugin: plugin.identity.key }, new AbortController().signal)).kind).toBe("changed");
    expect((await service.enable({ ...projectRequest, configurationPathContext: { scope: lifecycleProject } }, new AbortController().signal)).kind).toBe("changed");
    expect((await service.update(projectRequest, new AbortController().signal)).kind).toBe("changed");
    expect((await service.uninstall({ scope: lifecycleProject, plugin: plugin.identity.key, retainedData: "keep" }, new AbortController().signal)).kind).toBe("changed");

    rootAuthorityAvailable = false;
    expect(await service.install(projectRequest, new AbortController().signal)).toMatchObject({ kind: "rejected", operation: "install", code: "UNCONFIGURED" });

    const user = state.get({ kind: "user" });
    const project = state.get(lifecycleProject);
    expect(user.scope.kind).toBe("user");
    if (user.scope.kind === "user") expect(user.installed.plugins[0]?.activation).toBe("enabled");
    if (project.scope.kind === "project") expect(project.project.plugins).toHaveLength(0);
    expect(rootAcquireCalls).toBe(4);
    expect(rootVerifyCalls).toBe(3);
    expect(trustCalls).toHaveLength(3);
    expect(reloads).toHaveLength(6);
    expect(expectations.filter((value) => value.kind === "active").every((value) => value.projection.components.skills.length === 1 && value.projection.components.hooks.length === 1 && value.projection.components.mcpServers.length === 1)).toBe(true);
    const userProjection = expectations.find((value) => value.kind === "active" && value.projection.scope.kind === "user");
    const projectProjection = expectations.find((value) => value.kind === "active" && value.projection.scope.kind === "project");
    expect(userProjection?.kind).toBe("active");
    expect(projectProjection?.kind).toBe("active");
    if (userProjection?.kind === "active" && projectProjection?.kind === "active") {
      expect(userProjection.projection.dataRef).not.toBe(projectProjection.projection.dataRef);
      expect(userProjection.projection.digest).not.toBe(projectProjection.projection.digest);
    }
  });
});
