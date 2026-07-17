import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { getAgentDir, type ExtensionCommandContext, type ExtensionContext, type SessionShutdownEvent, type SessionStartEvent } from "@earendil-works/pi-coding-agent";
import { createCompatibilityService } from "../application/compatibility-service.js";
import { createGenerationMutationCoordinator } from "../application/generation-mutation-coordinator.js";
import { createLifecycleTransitionReconciler } from "../application/lifecycle-transition-reconciler.js";
import { createMarketplaceInspectionService } from "../application/marketplace-inspection-service.js";
import { createMarketplacePluginProbe } from "../application/marketplace-plugin-probe.js";
import { createPluginLifecycleService } from "../application/plugin-lifecycle-service.js";
import { createRuntimeProjectionCache } from "../infrastructure/filesystem/runtime-projection-cache.js";
import { createKeyedMutationScheduler } from "../infrastructure/state/keyed-mutation-scheduler.js";
import { createSqliteScopeLockManager } from "../infrastructure/state/sqlite-scope-lock.js";
import { createNodeLifecycleStateAdapters } from "../infrastructure/state/sqlite-lifecycle-state-store.js";
import { createSqlitePluginConfigurationStore } from "../infrastructure/configuration/sqlite-plugin-configuration-store.js";
import { createNodeConfigurationPathPort } from "../infrastructure/configuration/node-configuration-path.js";
import { createNodeHostIdentifiers } from "../infrastructure/node/node-identifiers.js";
import { createNodeLifecycleClock } from "../infrastructure/node/node-lifecycle-clock.js";
import { createNodeContentInfrastructure } from "../infrastructure/filesystem/create-content-store.js";
import { createNodeRecoveryAdapters } from "../infrastructure/recovery/create-node-recovery-adapters.js";
import { createPlatformSecretStore } from "../infrastructure/secrets/create-platform-secret-store.js";
import { createNodeMcpLaunchEnvironment } from "../infrastructure/environment/node-mcp-launch-environment.js";
import { createNodeHookExecutableResolver } from "../infrastructure/process/hook-executable-resolver.js";
import { createNodeCommandRunner } from "../infrastructure/process/command-runner.js";
import { createNodeSourceMaterializers } from "../infrastructure/source/create-source-materializers.js";
import { createManifestContentReader } from "../infrastructure/filesystem/manifest-content-reader.js";
import { readClaudeMarketplace } from "../formats/claude/marketplace-reader.js";
import { readCodexMarketplace } from "../formats/codex/marketplace-reader.js";
import { mergeMarketplaces } from "../formats/marketplace-merger.js";
import { createNodePluginInspector } from "./create-plugin-inspector.js";
import { createNodeMarketplaceUpdateServices } from "./create-marketplace-update-services.js";
import { createHostConfigurationServices } from "./create-host-configuration.js";
import { createNodePiRuntimeCapabilityProbe } from "./node-pi-runtime-capability-probe.js";
import { buildRuntimeDesiredState, type HostBlockedPlugin, type RuntimeDesiredState } from "./runtime-desired-state.js";
import { createRuntimeSelectionCatalog } from "./runtime-selection-catalog.js";
import { createComposedSkillHookRuntime } from "./create-skill-hook-runtime.js";
import { createComposedMcpRuntime } from "./create-mcp-runtime.js";
import { createCompletePluginReloadPort } from "./complete-plugin-reload.js";
import { createPiProjectContextAdapters } from "../pi/pi-project-context.js";
import { createPiSessionBinding } from "../pi/pi-session-binding.js";
import { createPluginHostBootstrap, claimPackagedPluginHostComposition } from "../pi/plugin-host-bootstrap.js";
import { createPluginHostRuntimeDelegates } from "../pi/plugin-host-runtime-delegates.js";
import { createPiReloadBroker, type PiReloadTicket } from "../pi/pi-reload-broker.js";
import {
  PackagedPluginHostError,
  PackagedPluginHostErrorCode,
  type HostStartupResult,
  type PackagedPluginHost,
  type PackagedPluginHostApplication,
  type PackagedPluginHostOptions,
  type StartedPackagedPluginHost,
} from "./packaged-plugin-host-contract.js";
import { createPluginHostPathPlan } from "./plugin-host-paths.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());

type Cleanup = () => Promise<void>;

function startupResult(input: Readonly<{
  blocked: readonly HostBlockedPlugin[];
  mcp: boolean;
  subagents: boolean;
  secrets: "available" | "unavailable";
}>): HostStartupResult {
  const status = (available: boolean, yes: string, no: string) => Object.freeze({ status: available ? "available" as const : "unavailable" as const, explanation: available ? yes : no });
  return Object.freeze({
    status: input.blocked.length === 0 ? "ready" : "blocked",
    blocked: Object.freeze(input.blocked.map((entry) => Object.freeze({ ...entry }))),
    capabilities: Object.freeze({
      mcp: status(input.mcp, "an MCP runtime participant is supplied", "no MCP runtime participant is supplied"),
      subagents: status(input.subagents, "a qualified subagent lifecycle participant is supplied", "no qualified subagent lifecycle participant is supplied"),
      piReload: status(true, "Pi command-context reload handoff is supported", "Pi reload handoff is unavailable"),
      secrets: status(input.secrets === "available", "encrypted operating-system secret custody is available", "encrypted operating-system secret custody is unavailable"),
    }),
  });
}

/** Construct the Pi package boundary. All filesystem/runtime work remains inside explicit start(). */
export function createPackagedPluginHost(options: PackagedPluginHostOptions): PackagedPluginHost {
  if (options === null || typeof options !== "object" || options.pi === undefined) {
    throw new PackagedPluginHostError(PackagedPluginHostErrorCode.invalidOptions, "packaged plugin host options are required");
  }
  const paths = createPluginHostPathPlan(options.agentDir ?? getAgentDir());
  const claim = claimPackagedPluginHostComposition(options.pi);
  const broker = createPiReloadBroker();
  const operationContexts = new AsyncLocalStorage<ExtensionCommandContext>();
  let bootstrap: ReturnType<typeof createPluginHostBootstrap>;
  let delegates: ReturnType<typeof createPluginHostRuntimeDelegates>;
  try {
    bootstrap = createPluginHostBootstrap(options.pi);
    delegates = createPluginHostRuntimeDelegates(options.pi);
  } catch (error) {
    claim.release();
    throw error;
  }
  let started: StartedPackagedPluginHost | undefined;
  let activeBinding: ReturnType<typeof createPiSessionBinding> | undefined;
  let startPromise: Promise<StartedPackagedPluginHost> | undefined;
  let reloadSuccessor: Readonly<{ ticket: PiReloadTicket; reload: ReturnType<typeof createCompletePluginReloadPort> }> | undefined;
  let terminal = false;

  async function start(_event: SessionStartEvent, context: ExtensionContext): Promise<StartedPackagedPluginHost> {
    if (terminal) throw new PackagedPluginHostError(PackagedPluginHostErrorCode.terminal, "packaged plugin host is terminal");
    if (started !== undefined) {
      activeBinding?.assertContext(context);
      return started;
    }
    if (startPromise !== undefined) {
      activeBinding?.assertContext(context);
      return startPromise;
    }
    startPromise = (async () => {
      const cleanup: Cleanup[] = [];
      let startupSuccessor: PiReloadTicket | undefined;
      const own = (dispose: Cleanup): void => { cleanup.push(dispose); };
      try {
        const binding = createPiSessionBinding(context);
        activeBinding = binding;
        const successor = broker.claimSuccessor(binding.current());
        startupSuccessor = successor;
        claim.claimSession(binding.current().sessionId, successor?.id);
        own(async () => claim.releaseSession());
        delegates.bindSession(binding);
        own(async () => delegates.clear());

        const project = await createPiProjectContextAdapters({ binding, sha256, git: createNodeCommandRunner() });
        const state = await createNodeLifecycleStateAdapters({ paths, currentProject: project.scope, sha256 });
        own(() => state.close());
        const configurations = await createSqlitePluginConfigurationStore({ root: paths.configurationRoot });
        own(async () => configurations[Symbol.asyncDispose]());
        const recoveryAdapters = await createNodeRecoveryAdapters({ hostRoot: paths.hostRoot });
        own(() => recoveryAdapters.close());
        const content = await createNodeContentInfrastructure({ hostRoot: paths.hostRoot });
        const secrets = await createPlatformSecretStore();
        own(() => secrets.close());
        const identifiers = createNodeHostIdentifiers();
        const clock = createNodeLifecycleClock();
        const configuration = createHostConfigurationServices({
          configurations,
          secrets: secrets.store,
          paths: createNodeConfigurationPathPort({ binding, projectRoots: project.authority }),
          projectRoots: project.authority,
          projectTrust: project.trust,
          writeIds: identifiers.configurationWriteIds,
          sha256,
        });
        const executableResolver = createNodeHookExecutableResolver();
        const capabilities = createNodePiRuntimeCapabilityProbe({
          commandHooks: true,
          skillToolRestrictions: true,
          executables: executableResolver,
          ...(options.runtime?.mcp === undefined ? {} : { mcp: options.runtime.mcp }),
          ...(options.runtime?.subagents === undefined ? {} : { subagents: options.runtime.subagents }),
          nodeVersion: process.versions.node,
          piVersion: "0.80.8",
        });
        const compatibility = createCompatibilityService(capabilities);
        const inspection = createNodePluginInspector();
        const projections = createRuntimeProjectionCache({ content: content.content, sha256 });
        const selections = createRuntimeSelectionCatalog(project.current());
        own(() => selections.close());
        const skillHook = await createComposedSkillHookRuntime({
          pi: options.pi,
          binding,
          delegates,
          selection: selections,
          content,
          project,
          configuration: configuration.execution,
          leases: recoveryAdapters.leases,
          clock,
          sha256,
          ...(options.runtime?.subagents === undefined ? {} : { subagents: options.runtime.subagents }),
        });
        own(() => skillHook.close());
        const mcp = createComposedMcpRuntime({
          ...(options.runtime?.mcp === undefined ? {} : { runtime: options.runtime.mcp }),
          selections,
          content: content.content,
          project,
          configuration: configuration.execution,
          environment: createNodeMcpLaunchEnvironment(),
          leases: recoveryAdapters.leases,
          clock,
          sessionId: binding.current().sessionId,
          sha256,
        });
        own(() => mcp.close());
        let latestDesired: RuntimeDesiredState | undefined;
        const desired = Object.freeze({
          async load(signal: AbortSignal): Promise<RuntimeDesiredState> {
            latestDesired = await buildRuntimeDesiredState({
              installed: content.installed,
              compatibility,
              projections,
              project,
              ...(options.runtime?.mcp === undefined ? {} : { mcp: options.runtime.mcp }),
              state: state.state,
              content: content.content,
              sha256,
            }, signal);
            return latestDesired;
          },
        });
        const reload = createCompletePluginReloadPort({
          binding,
          operationContext: { current: () => operationContexts.getStore() },
          broker,
          desired,
          selections,
          skillHook,
          mcp,
          transitions: recoveryAdapters.transitions,
          markDraining: claim.markDraining,
          sha256,
        });
        const locks = await createSqliteScopeLockManager({
          lockRoot: paths.lockRoot,
          retryDelayMs: { minimum: 5, maximum: 100 },
        });
        const mutations = createGenerationMutationCoordinator({ scheduler: createKeyedMutationScheduler(), locks, state: state.state });
        const reconciler = createLifecycleTransitionReconciler({ mutations, state: state.state, reload, transitions: recoveryAdapters.transitionStore, sha256 });
        const materializers = createNodeSourceMaterializers(options.source);
        const lifecycle = createPluginLifecycleService({
          state: state.state,
          mutations,
          content: content.content,
          materializer: materializers.plugins,
          inspector: inspection,
          compatibility,
          installed: content.installed,
          projections,
          reload,
          transitions: recoveryAdapters.transitionStore,
          operationIds: identifiers.operationIds,
          projectTrust: project.trust,
          projectRoots: project.authority,
          configurations,
          secrets: secrets.store,
          paths: createNodeConfigurationPathPort({ binding, projectRoots: project.authority }),
          sha256,
        });
        const recovery = recoveryAdapters.createRecoveryService({
          state: state.state,
          inventory: state.inventory,
          reconciler,
          reload,
          clock,
        });
        const collection = recoveryAdapters.createCollectionService({ state: state.state, inventory: state.inventory, mutations, clock });
        const marketplaceInspection = createMarketplaceInspectionService({
          content: createManifestContentReader(sha256),
          readers: { claude: readClaudeMarketplace, codex: readCodexMarketplace, merge: mergeMarketplaces },
          sha256,
        });
        const marketplaceProbe = createMarketplacePluginProbe({
          state: state.state,
          content: content.content,
          materializer: materializers.plugins,
          inspector: inspection,
          compatibility,
          sha256,
        });
        const marketplace = createNodeMarketplaceUpdateServices({ refresh: {
          inventory: state.inventory,
          state: state.state,
          mutations,
          clock,
          claimIds: identifiers.refreshClaimIds,
          materializers,
          inspection: marketplaceInspection,
          content: content.content,
          sha256,
          probe: marketplaceProbe,
          lifecycle,
        } });

        await recovery.recover({ requiredScopes: [{ kind: "user" }, project.scope] }, new AbortController().signal);
        if (successor === undefined) await reload.reconcileCurrent(new AbortController().signal);
        else await reload.acceptSuccessor(successor, new AbortController().signal);
        if (successor !== undefined) reloadSuccessor = Object.freeze({ ticket: successor, reload });
        const application: PackagedPluginHostApplication = Object.freeze({
          lifecycle,
          compatibility,
          inspection,
          configuration: configuration.application,
          recovery,
          collection,
          marketplace: Object.freeze({ inspection: marketplaceInspection, ...marketplace }),
          capabilities,
          resources: skillHook.resources,
        });
        const startup = startupResult({
          blocked: latestDesired?.blocked ?? [],
          mcp: options.runtime?.mcp !== undefined,
          subagents: skillHook.subagent !== undefined,
          secrets: secrets.availability.status,
        });
        let closePromise: Promise<void> | undefined;
        const value: StartedPackagedPluginHost = Object.freeze({
          application,
          startup,
          close(): Promise<void> {
            closePromise ??= (async () => {
              const errors: unknown[] = [];
              for (const dispose of [...cleanup].reverse()) {
                try { await dispose(); } catch (error) { errors.push(error); }
              }
              cleanup.length = 0;
              if (errors.length > 0) throw new AggregateError(errors, "packaged plugin host cleanup failed");
            })();
            return closePromise;
          },
        });
        started = value;
        return value;
      } catch (error) {
        terminal = true;
        if (startupSuccessor !== undefined) {
          try { broker.fail(startupSuccessor, error); } catch { /* preserve startup failure */ }
        }
        const errors: unknown[] = [error];
        for (const dispose of [...cleanup].reverse()) {
          try { await dispose(); } catch (cleanupError) { errors.push(cleanupError); }
        }
        if (errors.length > 1) throw new AggregateError(errors, "packaged plugin host startup failed");
        throw new PackagedPluginHostError(PackagedPluginHostErrorCode.startupFailed, "packaged plugin host startup failed", error);
      }
    })();
    return startPromise;
  }

  async function dispose(_reason: SessionShutdownEvent["reason"]): Promise<void> {
    terminal = true;
    try {
      if (started !== undefined) await started.close();
      else if (startPromise !== undefined) await startPromise.then((value) => value.close(), () => undefined);
    } finally {
      started = undefined;
      activeBinding = undefined;
      if (reloadSuccessor !== undefined) {
        try { reloadSuccessor.reload.failSuccessor(reloadSuccessor.ticket); } catch { /* ticket may already be settled */ }
        reloadSuccessor = undefined;
      }
      bootstrap.clear(target);
      delegates.clear();
      claim.release();
    }
  }

  const host: PackagedPluginHost = {
    start,
    current: () => started,
    async runWithPiOperationContext<T>(
      context: ExtensionCommandContext,
      signal: AbortSignal,
      use: (application: PackagedPluginHostApplication) => Promise<T>,
    ): Promise<T> {
      signal.throwIfAborted();
      const current = started;
      if (current === undefined) throw new PackagedPluginHostError(PackagedPluginHostErrorCode.terminal, "packaged plugin host is not started");
      activeBinding?.assertContext(context);
      return operationContexts.run(context, () => use(current.application));
    },
    dispose,
  };
  const target = Object.freeze({
    sessionStart: (event: SessionStartEvent, context: ExtensionContext) => start(event, context).then(() => undefined),
    async resourcesDiscover(_event: Readonly<{ type: "resources_discover"; cwd: string; reason: "startup" | "reload" }>, context: ExtensionContext) {
      const current = started;
      if (current === undefined) return;
      activeBinding?.assertContext(context);
      const resources = current.application.resources as { discover(request: Readonly<{ reason: "startup" | "reload"; projectTrusted: boolean }>, signal: AbortSignal): Promise<Readonly<{ kind: string; skillPaths?: readonly string[] }>> };
      const result = await resources.discover({ reason: _event.reason, projectTrusted: activeBinding?.isProjectTrusted() === true }, new AbortController().signal);
      if (result.kind === "ready" && reloadSuccessor !== undefined) {
        reloadSuccessor.reload.publishSuccessor(reloadSuccessor.ticket);
        reloadSuccessor = undefined;
      } else if (result.kind !== "ready" && reloadSuccessor !== undefined) {
        reloadSuccessor.reload.failSuccessor(reloadSuccessor.ticket, new Error("Pi reload resource publication failed"));
        reloadSuccessor = undefined;
      }
      return result.kind === "ready" ? { skillPaths: [...(result.skillPaths ?? [])] } : undefined;
    },
    sessionShutdown: (event: SessionShutdownEvent, context: ExtensionContext) => {
      activeBinding?.assertContext(context);
      return dispose(event.reason);
    },
  });
  bootstrap.activate(target);
  return Object.freeze(host);
}
