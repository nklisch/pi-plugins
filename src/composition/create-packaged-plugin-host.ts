import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { VERSION as PI_VERSION, getAgentDir, type ExtensionCommandContext, type ExtensionContext, type SessionShutdownEvent, type SessionStartEvent } from "@earendil-works/pi-coding-agent";
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
import { createNodeMarketplaceDiscoveryServices } from "./create-marketplace-discovery-services.js";
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
import { qualifyRuntimeParticipants, type RuntimeQualificationStatus } from "./runtime-participant-qualification.js";

const sha256 = (bytes: Uint8Array): Uint8Array => new Uint8Array(createHash("sha256").update(bytes).digest());

type Cleanup = () => Promise<void>;
type PiApplicationOperationFrame = {
  readonly context: ExtensionCommandContext;
  reloadContext: ExtensionCommandContext | undefined;
};

function startupResult(input: Readonly<{
  blocked: readonly HostBlockedPlugin[];
  mcp: RuntimeQualificationStatus;
  subagents: RuntimeQualificationStatus;
  piReload: RuntimeQualificationStatus;
  secrets: "available" | "unavailable";
}>): HostStartupResult {
  const secrets = input.secrets === "available"
    ? { status: "available" as const, explanation: "encrypted operating-system secret custody is available" }
    : { status: "unavailable" as const, explanation: "encrypted operating-system secret custody is unavailable" };
  return Object.freeze({
    status: input.blocked.length === 0 ? "ready" : "blocked",
    blocked: Object.freeze(input.blocked.map((entry) => Object.freeze({ ...entry }))),
    capabilities: Object.freeze({
      mcp: Object.freeze({ status: input.mcp.status, explanation: input.mcp.explanation }),
      subagents: Object.freeze({ status: input.subagents.status, explanation: input.subagents.explanation }),
      piReload: Object.freeze({ status: input.piReload.status, explanation: input.piReload.explanation }),
      secrets: Object.freeze(secrets),
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
  const operationContexts = new AsyncLocalStorage<PiApplicationOperationFrame>();
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
  let operationAdmission = true;
  let admittedOperations = 0;
  let operationDrain: Promise<void> | undefined;
  let resolveOperationDrain: (() => void) | undefined;
  let closeRuntime: (() => Promise<void>) | undefined;
  let closeApplication: (() => Promise<void>) | undefined;
  let runtimeShutdownPromise: Promise<void> | undefined;
  let finalClosePromise: Promise<void> | undefined;
  let sessionStartDispatch: Promise<void> | undefined;
  let sessionEndPromise: Promise<void> | undefined;

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
        const startupSignal = new AbortController().signal;
        const qualification = await qualifyRuntimeParticipants({
          pi: options.pi,
          nodeVersion: process.versions.node,
          piVersion: PI_VERSION,
          ...(options.runtime?.mcp === undefined ? {} : { mcp: options.runtime.mcp }),
          ...(options.runtime?.subagents === undefined ? {} : { subagents: options.runtime.subagents }),
          signal: startupSignal,
        });
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
          executables: executableResolver,
          qualification,
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
          ...(qualification.subagents.lifecycle === undefined ? {} : { subagents: qualification.subagents.lifecycle }),
        });
        own(() => skillHook.close());
        const mcp = createComposedMcpRuntime({
          ...(qualification.mcp.runtime === undefined ? {} : { runtime: qualification.mcp.runtime }),
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
        let closeRuntimeResources: Promise<void> | undefined;
        closeRuntime = () => {
          closeRuntimeResources ??= (async () => {
            skillHook.quiesce();
            const errors: unknown[] = [];
            for (const dispose of [() => mcp.close(), () => skillHook.close(), () => selections.close()]) {
              try { await dispose(); } catch (error) { errors.push(error); }
            }
            if (errors.length > 0) throw new AggregateError(errors, "packaged plugin runtime cleanup failed");
          })();
          return closeRuntimeResources;
        };
        let latestDesired: RuntimeDesiredState | undefined;
        const desired = Object.freeze({
          async load(signal: AbortSignal, overrides = []): Promise<RuntimeDesiredState> {
            latestDesired = await buildRuntimeDesiredState({
              installed: content.installed,
              compatibility,
              projections,
              project,
              ...(qualification.mcp.runtime === undefined ? {} : { mcp: qualification.mcp.runtime }),
              state: state.state,
              content: content.content,
              sha256,
            }, signal, overrides);
            return latestDesired;
          },
        });
        const reload = createCompletePluginReloadPort({
          binding,
          operationContext: {
            takeReloadContext: () => {
              const frame = operationContexts.getStore();
              const context = frame?.reloadContext;
              if (frame !== undefined) frame.reloadContext = undefined;
              return context;
            },
          },
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
        const marketplace = createNodeMarketplaceDiscoveryServices({
          inventory: state.inventory,
          state: state.state,
          mutations,
          clock,
          claimIds: identifiers.refreshClaimIds,
          materializers,
          inspection: marketplaceInspection,
          content: content.content,
          currentProject: project.scope,
          projectTrust: project.trust,
          sha256,
          probe: marketplaceProbe,
          lifecycle,
        });

        const recoveryResult = await recovery.recover({ requiredScopes: [{ kind: "user" }, project.scope] }, startupSignal);
        if (successor === undefined) await reload.reconcileCurrent(startupSignal);
        else await reload.acceptSuccessor(successor, startupSignal);
        if (successor !== undefined) reloadSuccessor = Object.freeze({ ticket: successor, reload });
        const application: PackagedPluginHostApplication = Object.freeze({
          lifecycle,
          compatibility,
          inspection,
          configuration: configuration.application,
          recovery,
          collection,
          marketplace,
          capabilities,
          resources: skillHook.resources,
        });
        const unresolvedRecovery: HostBlockedPlugin[] = successor === undefined
          ? recoveryResult.results
              .filter((result) => result.kind === "blocked" || result.kind === "deferred")
              .map((result) => ({
                plugin: result.plugin ?? "host-recovery",
                code: `RECOVERY_${result.code}`,
                explanation: "startup recovery did not settle authoritative pending state",
              }))
          : [];
        const startup = startupResult({
          blocked: [...(latestDesired?.blocked ?? []), ...unresolvedRecovery],
          mcp: qualification.mcp,
          subagents: qualification.subagents,
          piReload: qualification.hostApi,
          secrets: secrets.availability.status,
        });
        let applicationClosePromise: Promise<void> | undefined;
        closeApplication = () => {
          applicationClosePromise ??= (async () => {
            const errors: unknown[] = [];
            for (const dispose of [...cleanup].reverse()) {
              try { await dispose(); } catch (error) { errors.push(error); }
            }
            cleanup.length = 0;
            if (errors.length > 0) throw new AggregateError(errors, "packaged plugin host cleanup failed");
          })();
          return applicationClosePromise;
        };
        const value: StartedPackagedPluginHost = Object.freeze({
          application,
          startup,
          close: () => dispose("quit"),
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

  function waitForOperations(): Promise<void> {
    if (admittedOperations === 0) return Promise.resolve();
    operationDrain ??= new Promise<void>((resolve) => { resolveOperationDrain = resolve; });
    return operationDrain;
  }

  function ensureFinalClose(): Promise<void> {
    finalClosePromise ??= (async () => {
      try {
        await waitForOperations();
        if (closeApplication !== undefined) await closeApplication();
        else if (startPromise !== undefined) await startPromise.then(() => closeApplication?.(), () => undefined);
      } finally {
        activeBinding = undefined;
        if (reloadSuccessor !== undefined) {
          try { reloadSuccessor.reload.failSuccessor(reloadSuccessor.ticket); } catch { /* ticket may already be settled */ }
          reloadSuccessor = undefined;
        }
        bootstrap.clear(target);
        delegates.clear();
        claim.release();
      }
    })();
    return finalClosePromise;
  }

  async function beginSessionShutdown(
    event?: SessionShutdownEvent,
    context?: ExtensionContext,
  ): Promise<void> {
    terminal = true;
    operationAdmission = false;
    started = undefined;
    if (event !== undefined && context !== undefined) {
      sessionEndPromise ??= delegates.dispatchSessionEnd(event, context);
      await sessionEndPromise;
    }
    delegates.quiesce();
    runtimeShutdownPromise ??= closeRuntime?.() ?? Promise.resolve();
    try {
      await runtimeShutdownPromise;
    } finally {
      // Do not await durable cleanup here: ctx.reload() cannot start the
      // successor while Pi is blocked in predecessor session_shutdown.
      void ensureFinalClose().catch(() => undefined);
    }
  }

  async function dispose(_reason: SessionShutdownEvent["reason"]): Promise<void> {
    await beginSessionShutdown();
    await ensureFinalClose();
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
      if (!operationAdmission || current === undefined) throw new PackagedPluginHostError(PackagedPluginHostErrorCode.terminal, "packaged plugin host is not started");
      activeBinding?.assertContext(context);
      admittedOperations += 1;
      const frame: PiApplicationOperationFrame = { context, reloadContext: context };
      try {
        return await operationContexts.run(frame, () => use(current.application));
      } finally {
        admittedOperations -= 1;
        if (admittedOperations === 0) {
          resolveOperationDrain?.();
          resolveOperationDrain = undefined;
          operationDrain = undefined;
        }
      }
    },
    dispose,
  };
  const target = Object.freeze({
    async sessionStart(event: SessionStartEvent, context: ExtensionContext): Promise<void> {
      await start(event, context);
      sessionStartDispatch ??= delegates.dispatchSessionStart(event, context);
      await sessionStartDispatch;
    },
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
    async sessionShutdown(event: SessionShutdownEvent, context: ExtensionContext): Promise<void> {
      activeBinding?.assertContext(context);
      await beginSessionShutdown(event, context);
    },
  });
  bootstrap.activate(target);
  return Object.freeze(host);
}
