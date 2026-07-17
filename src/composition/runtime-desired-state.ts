import type { CompatibilityService } from "../application/compatibility-service.js";
import { createPluginMcpProjection } from "../application/mcp-plugin-projection.js";
import type { ContentStorePort } from "../application/ports/content-store.js";
import type { InstalledPluginLoader } from "../application/ports/installed-plugin-loader.js";
import {
  McpRuntimeCapabilitiesSchemaV1,
  type McpRuntimeCapabilities,
  type McpRuntimePort,
} from "../application/ports/mcp-runtime.js";
import type { LifecycleStateStore } from "../application/ports/lifecycle-state-store.js";
import {
  createActiveProjectionExpectation,
  createInactiveProjectionExpectation,
  createPluginRuntimeProjection,
} from "../application/ports/runtime-projection.js";
import type { RuntimeProjectionCachePort } from "../application/runtime-projection-cache.js";
import { createTrustCandidate } from "../domain/trust-policy.js";
import type { InstalledPluginRecord } from "../domain/state/installed-state.js";
import { toScopeReference, type ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import type { PiProjectContextAdapters } from "../pi/pi-project-context.js";
import { digestSkillHookContribution, type RuntimeProjectionSelection } from "../runtime/skill-hook/runtime-snapshot.js";
import type { SkillHookRuntimeSetRequest } from "../runtime/skill-hook/runtime-catalog.js";
import type { McpLifecycleState } from "../runtime/mcp/lifecycle-participant.js";
import type { GenerationSnapshot } from "../application/state-contract.js";
import type { RuntimeSelection } from "./runtime-selection-catalog.js";

export type HostBlockedPlugin = Readonly<{
  plugin: string;
  code: string;
  explanation: string;
}>;

export type RuntimeDesiredState = Readonly<{
  currentProject: ReturnType<PiProjectContextAdapters["current"]>;
  selections: readonly RuntimeSelection[];
  skillHook: SkillHookRuntimeSetRequest;
  mcp: readonly Readonly<{ from: McpLifecycleState; to: McpLifecycleState }>[];
  blocked: readonly HostBlockedPlugin[];
}>;

const unavailableMcpCapabilities: McpRuntimeCapabilities = McpRuntimeCapabilitiesSchemaV1.parse({
  schemaVersion: 1,
  sourceLifecycle: {
    initialSourcesBeforeToolRegistration: false,
    isolatedFileDiscovery: false,
    localValidation: false,
    atomicReplace: false,
    exactRemove: false,
    inspect: false,
    cancellable: false,
    lateLaunchValues: false,
    runtimeLeases: false,
  },
  transports: { stdio: false, streamableHttp: false, legacySse: false, websocket: false },
  oauth: { authorizationCode: false, clientCredentials: false },
  features: {
    sampling: false,
    elicitationForm: false,
    elicitationUrl: false,
    toolApproval: false,
    resources: false,
    pluginToolAliases: false,
  },
});

function selected(record: InstalledPluginRecord) {
  return record.revisions.find((revision) => revision.revision === record.selectedRevision);
}

/** Rebuild exact desired runtime state from authority; caches are replaceable. */
export async function buildRuntimeDesiredState(input: Readonly<{
  scopes?: readonly GenerationSnapshot[];
  installed: InstalledPluginLoader;
  compatibility: CompatibilityService;
  projections: RuntimeProjectionCachePort;
  project: PiProjectContextAdapters;
  mcp?: McpRuntimePort;
  state: LifecycleStateStore;
  content?: Pick<ContentStorePort, "resolvePlugin" | "ensureDataRoot">;
  sha256: Sha256;
}>, signal: AbortSignal): Promise<RuntimeDesiredState> {
  signal.throwIfAborted();
  const currentProject = input.project.current();
  const authoritative: GenerationSnapshot[] = [];
  const user = await input.state.read({ kind: "user" }, signal);
  if (!user.ok) throw new Error("authoritative user state is corrupt");
  authoritative.push(user.snapshot);
  if (currentProject.trust.kind === "trusted") {
    const project = await input.state.read(input.project.scope, signal);
    if (!project.ok) throw new Error("authoritative current-project state is corrupt");
    authoritative.push(project.snapshot);
  }
  void input.scopes;

  const trustRecords = authoritative.find((snapshot) => "trust" in snapshot && snapshot.scope.kind === "user");
  const records: Array<{ scope: ScopeContext; record: InstalledPluginRecord }> = [];
  for (const snapshot of authoritative) {
    if ("installed" in snapshot) {
      records.push(...snapshot.installed.plugins.map((record) => ({ scope: snapshot.scope, record })));
    } else {
      records.push(...snapshot.project.plugins.map((record) => ({ scope: snapshot.scope, record })));
    }
  }
  const blocked: HostBlockedPlugin[] = [];
  const selections: RuntimeSelection[] = [];
  const skillHookActive: RuntimeProjectionSelection[] = [];
  const mcpTransitions: Array<{ from: McpLifecycleState; to: McpLifecycleState }> = [];
  const runtimeCapabilities = input.mcp === undefined
    ? unavailableMcpCapabilities
    : McpRuntimeCapabilitiesSchemaV1.parse(await input.mcp.capabilities(signal));

  for (const entry of records) {
    signal.throwIfAborted();
    if (entry.record.activation !== "enabled") continue;
    const revision = selected(entry.record);
    if (revision === undefined) {
      blocked.push({ plugin: entry.record.plugin, code: "REVISION_UNAVAILABLE", explanation: "selected installed revision is unavailable" });
      continue;
    }
    try {
      const loaded = await input.installed.load({ scope: entry.scope, revision }, signal);
      const compatibility = await input.compatibility.assess({ plugin: loaded.plugin }, signal);
      if (!compatibility.activatable) {
        blocked.push({ plugin: entry.record.plugin, code: "CAPABILITY_UNAVAILABLE", explanation: "current runtime capabilities do not support the complete plugin" });
        continue;
      }
      const scopeReference = toScopeReference(entry.scope);
      const expectation = createActiveProjectionExpectation(createPluginRuntimeProjection({
        scope: scopeReference,
        plugin: loaded.plugin,
        compatibility,
        revision,
        sha256: input.sha256,
      }), input.sha256);
      await input.projections.prepare(expectation, signal);
      const cached = await input.projections.read(expectation, signal);
      if (cached.kind !== "ready") throw new Error("runtime projection cache could not be rebuilt");
      const skillHook: RuntimeProjectionSelection = Object.freeze({ prepared: cached.value, revision });
      const candidate = createTrustCandidate({
        scope: scopeReference,
        marketplaceSource: loaded.marketplaceSource,
        plugin: loaded.plugin,
        compatibility,
        content: loaded.content,
        materializationBinding: loaded.binding,
      }, input.sha256);
      const pathContext = Object.freeze({ scope: entry.scope });
      const records = trustRecords !== undefined && "trust" in trustRecords ? trustRecords.trust.records : [];
      const roots = input.content === undefined ? undefined : await Promise.all([
        input.content.resolvePlugin(revision, signal, scopeReference),
        input.content.ensureDataRoot({ scope: scopeReference, plugin: entry.record.plugin, dataRef: revision.dataRef }, signal),
      ]);
      const contributionDigest = digestSkillHookContribution({
        scope: scopeReference,
        plugin: entry.record.plugin,
        revision: revision.revision,
        projectionDigest: expectation.projection.digest,
        skills: expectation.projection.components.skills,
        hooks: expectation.projection.components.hooks,
      }, input.sha256);
      const hooks = roots === undefined ? [] : expectation.projection.components.hooks.map((component, hookOrdinal) => ({
        binding: {
          scope: scopeReference,
          plugin: entry.record.plugin,
          revision: revision.revision,
          projectionDigest: expectation.projection.digest,
          contributionDigest,
          componentId: component.id,
          sourceOrder: { snapshotOrdinal: selections.length, hookOrdinal },
        },
        pluginRoot: roots[0].root,
        pluginDataRoot: roots[1].root,
        currentProject,
        candidate,
        trustRecords: records,
        configurationRef: revision.configurationRef,
        descriptors: loaded.plugin.configuration,
        pathContext,
      }));
      const mcpProjection = createPluginMcpProjection({
        projection: expectation.projection,
        compatibility,
        runtimeCapabilities,
        sha256: input.sha256,
      });
      const from: McpLifecycleState = {
        kind: "inactive",
        expectation: createInactiveProjectionExpectation({ scope: scopeReference, plugin: entry.record.plugin, sha256: input.sha256 }),
      };
      const to: McpLifecycleState = mcpProjection.kind === "none"
        ? { kind: "none", expectation, projection: mcpProjection }
        : { kind: "source", expectation, projection: mcpProjection, capabilities: runtimeCapabilities };
      mcpTransitions.push({ from, to });
      const mcp = mcpProjection.kind === "none" ? [] : Object.entries(mcpProjection.registration.source.servers).map(([serverKey, server]) => {
        const component = expectation.projection.components.mcpServers.find((candidate) => candidate.id === server.componentId);
        if (component === undefined) throw new Error("MCP projection component is unavailable");
        const binding = {
          schemaVersion: 1 as const,
          source: mcpProjection.registration.source.identity,
          serverKey: serverKey as never,
          componentId: server.componentId,
          transport: server.transport,
        };
        return {
          binding,
          selection: {
            expectation,
            revision,
            component,
            currentProject,
            candidate,
            trustRecords: records,
            descriptors: loaded.plugin.configuration,
            pathContext,
          },
        };
      });
      const selection: RuntimeSelection = Object.freeze({
        scope: scopeReference,
        plugin: entry.record.plugin,
        revision,
        skillHook,
        hooks: Object.freeze(hooks),
        mcp: Object.freeze(mcp),
      });
      selections.push(selection);
      skillHookActive.push(skillHook);
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "RUNTIME_RECONSTRUCTION_FAILED";
      blocked.push({ plugin: entry.record.plugin, code, explanation: "installed plugin runtime evidence could not be reconstructed" });
    }
  }
  return Object.freeze({
    currentProject,
    selections: Object.freeze(selections),
    skillHook: Object.freeze({ active: Object.freeze(skillHookActive), currentProject }),
    mcp: Object.freeze(mcpTransitions),
    blocked: Object.freeze(blocked),
  });
}
