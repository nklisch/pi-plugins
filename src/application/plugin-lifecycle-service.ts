import { z } from "zod";
import {
  LifecycleOperationSchema,
  LifecycleOriginSchema,
  LifecycleRetainedDataSchema,
  LifecycleRejectionCodeSchema,
  type LifecycleOperation,
  type LifecycleOrigin,
  type LifecycleRejectionCode,
  type LifecycleRetainedData,
} from "./plugin-lifecycle-contract.js";
import {
  ActivationObservationSchema,
  LifecycleReloadResultSchema,
  type ActivationObservation,
  type LifecycleReloadPort,
} from "./ports/lifecycle-reload.js";
import {
  createActiveProjectionExpectation,
  createInactiveProjectionExpectation,
  createPluginRuntimeProjection,
  verifyProjectionExpectation,
  type ProjectionExpectation,
  type RuntimeProjectionPort,
} from "./ports/runtime-projection.js";
import {
  createLifecycleTransitionRecord,
  type LifecycleTransitionRecord,
  type LifecycleTransitionStore,
} from "./ports/lifecycle-transition-store.js";
import type { LifecycleOperationIdPort } from "./ports/lifecycle-operation-id.js";
import type { InstalledPluginLoader } from "./ports/installed-plugin-loader.js";
import type {
  CandidatePreparationCode,
  EnableCandidatePreparationRequest,
  PluginCandidatePreparationDependencies,
  PluginCandidatePreparationRequest,
  PreparedPluginCandidate,
} from "./plugin-candidate-preparation.js";
import {
  prepareEnableCandidate,
  prepareInactiveProjection,
  preparePluginCandidate,
} from "./plugin-candidate-preparation.js";
import type { PluginMaterializer } from "./source-materialization.js";
import type { PluginInspectionService } from "./inspection-service.js";
import type { CompatibilityService } from "./compatibility-service.js";
import type { ContentStorePort, PromotionResult } from "./ports/content-store.js";
import type { ProjectTrustPort } from "./ports/project-trust.js";
import type { ProjectRootAuthorityPort } from "./ports/project-root-authority.js";
import type { PluginConfigurationStore } from "./ports/plugin-configuration-store.js";
import type { SecretStore } from "./ports/secret-store.js";
import type { ConfigurationPathPort, ConfigurationPathContext } from "./ports/configuration-path.js";
import type { LifecycleStateStore } from "./ports/lifecycle-state-store.js";
import {
  parseStateMutation,
  type GenerationSnapshot,
  type StateMutation,
} from "./state-contract.js";
import {
  createInstalledPluginRecord,
  createInstalledRevisionRecord,
  InstalledPluginRecordSchema,
  type InstalledPluginRecord,
  type InstalledRevisionRecord,
} from "../domain/state/installed-state.js";
import {
  createInstalledUserStateDocument,
} from "../domain/state/installed-state.js";
import { createProjectLocalStateDocument } from "../domain/state/project-state.js";
import {
  ScopeContextSchema,
  createScopeContext,
  toScopeReference,
  type ScopeContext,
  type ScopeReference,
} from "../domain/state/scope.js";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import type { Generation } from "../domain/state/config-state.js";
import type { TrustStateRecord } from "../domain/state/trust-state.js";
import type { NormalizedMarketplaceEntry } from "../domain/marketplace.js";
import type { ResolvedMarketplaceSource } from "../domain/source.js";
import type { SourceContext } from "./source-materialization.js";
import type { Sha256 } from "../domain/source.js";
import { createLifecycleTransitionReconciler } from "./lifecycle-transition-reconciler.js";

export type InstallPluginRequest = Readonly<{
  scope: ScopeContext;
  plugin: PluginKey;
  origin?: LifecycleOrigin;
  entry: NormalizedMarketplaceEntry;
  marketplaceSource: ResolvedMarketplaceSource;
  sourceContext: SourceContext;
  trustRecords?: readonly TrustStateRecord[];
  configurationPathContext: ConfigurationPathContext;
}>;
export type UpdatePluginRequest = InstallPluginRequest;
export type EnablePluginRequest = Readonly<{
  scope: ScopeContext;
  plugin: PluginKey;
  origin?: LifecycleOrigin;
  trustRecords?: readonly TrustStateRecord[];
  configurationPathContext: ConfigurationPathContext;
}>;
export type DisablePluginRequest = Readonly<{
  scope: ScopeContext;
  plugin: PluginKey;
  origin?: LifecycleOrigin;
}>;
export type UninstallPluginRequest = Readonly<{
  scope: ScopeContext;
  plugin: PluginKey;
  origin?: LifecycleOrigin;
  retainedData?: LifecycleRetainedData;
}>;

export type LifecycleActivationFailure =
  | Readonly<{ kind: "reload-rejected"; code: "RELOAD_REJECTED" }>
  | Readonly<{ kind: "observation-mismatch"; code: "OBSERVATION_MISMATCH" }>
  | Readonly<{ kind: "adapter-error"; code: "ADAPTER_FAILED" | "ABORTED" }>;

export type LifecycleCleanupIntent = Readonly<{
  kind: "deferred";
  retainedData: LifecycleRetainedData;
}>;

export type PluginLifecycleResult =
  | Readonly<{
      kind: "changed";
      operation: LifecycleOperation;
      snapshot: GenerationSnapshot;
      observation: ActivationObservation;
      cleanup?: LifecycleCleanupIntent;
    }>
  | Readonly<{ kind: "unchanged"; operation: LifecycleOperation; snapshot: GenerationSnapshot }>
  | Readonly<{ kind: "rejected"; operation: LifecycleOperation; code: LifecycleRejectionCode }>
  | Readonly<{ kind: "stale"; operation: LifecycleOperation; expected: Generation; actual: Generation }>
  | Readonly<{
      kind: "rolled-back";
      operation: LifecycleOperation;
      failure: LifecycleActivationFailure;
      snapshot: GenerationSnapshot;
      observation: ActivationObservation;
    }>
  | Readonly<{
      kind: "recovery-required";
      operation: LifecycleOperation;
      transition: import("../domain/state/references.js").PendingTransitionRef;
      committed?: Generation;
    }>;

export interface PluginLifecycleService {
  install(request: InstallPluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  enable(request: EnablePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  disable(request: DisablePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  update(request: UpdatePluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
  uninstall(request: UninstallPluginRequest, signal: AbortSignal): Promise<PluginLifecycleResult>;
}

export type PluginLifecycleServiceDependencies = Readonly<{
  state: LifecycleStateStore;
  mutations: import("./generation-mutation-coordinator.js").GenerationMutationCoordinator;
  content: ContentStorePort;
  materializer: PluginMaterializer;
  inspector: PluginInspectionService;
  compatibility: CompatibilityService;
  installed: InstalledPluginLoader;
  projections: RuntimeProjectionPort;
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  operationIds: LifecycleOperationIdPort;
  projectTrust: ProjectTrustPort;
  projectRoots: ProjectRootAuthorityPort;
  configurations: PluginConfigurationStore;
  secrets: SecretStore;
  paths: ConfigurationPathPort;
  sha256: Sha256;
}>;

class GuardMismatch extends Error {
  readonly generation: Generation;
  constructor(generation: Generation) {
    super("lifecycle target changed while a prepared transition was waiting");
    this.name = "GuardMismatch";
    this.generation = generation;
  }
}

class PromotionFailure extends Error {
  constructor() {
    super("content promotion did not return the requested immutable revision");
    this.name = "PromotionFailure";
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function asScopeContext(input: ScopeContext, sha256: Sha256): ScopeContext {
  return createScopeContext(ScopeContextSchema.parse(input), sha256);
}

function targetRecord(snapshot: GenerationSnapshot, plugin: PluginKey): InstalledPluginRecord | undefined {
  return "installed" in snapshot
    ? snapshot.installed.plugins.find((record: InstalledPluginRecord) => record.plugin === plugin)
    : snapshot.project.plugins.find((record: InstalledPluginRecord) => record.plugin === plugin);
}

function withoutPending(record: InstalledPluginRecord): InstalledPluginRecord {
  const { pendingTransition: _pendingTransition, ...value } = record;
  return InstalledPluginRecordSchema.parse(value);
}

function withPending(record: InstalledPluginRecord, reference: import("../domain/state/references.js").PendingTransitionRef, _sha256: Sha256): InstalledPluginRecord {
  return InstalledPluginRecordSchema.parse({ ...withoutPending(record), pendingTransition: reference });
}

function scopeRecords(snapshot: GenerationSnapshot): readonly InstalledPluginRecord[] {
  return "installed" in snapshot ? snapshot.installed.plugins : snapshot.project.plugins;
}

function replaceTarget(
  snapshot: GenerationSnapshot,
  plugin: PluginKey,
  replacement: InstalledPluginRecord | null,
  sha256: Sha256,
): StateMutation {
  const records = scopeRecords(snapshot).filter((record) => record.plugin !== plugin);
  if (replacement !== null) records.push(replacement);
  if ("installed" in snapshot) {
    const installed = createInstalledUserStateDocument({
      ...snapshot.installed,
      generation: snapshot.generation,
      plugins: records,
    }, sha256);
    return parseStateMutation({
      scope: snapshot.scope,
      expectedGeneration: snapshot.generation,
      replace: { installed },
    }, sha256);
  }
  const project = createProjectLocalStateDocument({
    ...snapshot.project,
    generation: snapshot.generation,
    plugins: records,
  }, snapshot.scope, sha256);
  return parseStateMutation({
    scope: snapshot.scope,
    expectedGeneration: snapshot.generation,
    replace: { project },
  }, sha256);
}

function mapPreparationCode(code: CandidatePreparationCode): LifecycleRejectionCode {
  switch (code) {
    case "INCOMPATIBLE": return "INCOMPATIBLE";
    case "UNTRUSTED": return "UNTRUSTED";
    case "UNCONFIGURED": return "UNCONFIGURED";
    case "PROJECTION_FAILED": return "PROJECTION_FAILED";
    case "ABORTED": return "ABORTED";
    default: return "MALFORMED";
  }
}

function safeFailure(error: unknown): LifecycleActivationFailure {
  if (error instanceof DOMException && error.name === "AbortError") return { kind: "adapter-error", code: "ABORTED" };
  if (error !== null && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError") {
    return { kind: "adapter-error", code: "ABORTED" };
  }
  return { kind: "adapter-error", code: "ADAPTER_FAILED" };
}

function cleanupSignal(): AbortSignal {
  return new AbortController().signal;
}

async function discardCandidate(
  dependencies: PluginLifecycleServiceDependencies,
  candidate: PreparedPluginCandidate | undefined,
): Promise<void> {
  if (candidate?.allocation === undefined) return;
  try {
    await dependencies.content.discardStaging(candidate.allocation, cleanupSignal());
  } catch {
    // Published content and staging roots are inert until referenced by state.
  }
}

async function preparePreviousExpectation(
  dependencies: PluginLifecycleServiceDependencies,
  scope: ScopeContext,
  plugin: PluginKey,
  previous: InstalledPluginRecord | undefined,
  signal: AbortSignal,
): Promise<ProjectionExpectation> {
  if (previous === undefined || previous.activation === "disabled") {
    return prepareInactiveProjection(dependencies, { scope, plugin }, signal);
  }
  const selected = previous.revisions.find((revision) => revision.revision === previous.selectedRevision);
  if (selected === undefined) throw new Error("installed state selected revision is missing");
  const loaded = await dependencies.installed.load({ scope, revision: selected }, signal);
  if (loaded.binding !== selected.revision || loaded.plugin.identity.key !== plugin) throw new Error("installed loader returned a different selected revision");
  const reconstructed = createInstalledRevisionRecord({
    plugin: loaded.plugin,
    compatibility: loaded.compatibility,
    content: loaded.content,
    revision: selected.revision,
    contentRef: selected.contentRef,
    dataRef: selected.dataRef,
    ...(selected.configurationRef === undefined ? {} : { configurationRef: selected.configurationRef }),
    scope: toScopeReference(scope),
  }, dependencies.sha256);
  if (!sameJson(reconstructed, selected)) throw new Error("installed loader evidence does not match selected state");
  const projection = createActiveProjectionExpectation(createPluginRuntimeProjection({
    scope: toScopeReference(scope),
    plugin: loaded.plugin,
    compatibility: loaded.compatibility,
    revision: selected,
    sha256: dependencies.sha256,
  }), dependencies.sha256);
  const prepared = await dependencies.projections.prepare(projection, signal);
  const verified = verifyProjectionExpectation(prepared, dependencies.sha256);
  if (!sameJson(verified, projection)) throw new Error("previous projection adapter returned different evidence");
  return verified;
}

function observationMatches(
  observation: ActivationObservation,
  expectation: ProjectionExpectation,
  plugin: PluginKey,
): boolean {
  if (expectation.kind === "inactive") {
    return observation.kind === "inactive" && sameJson(observation.scope, expectation.scope) && observation.plugin === plugin;
  }
  return observation.kind === "active" &&
    sameJson(observation.scope, expectation.projection.scope) &&
    observation.plugin === plugin &&
    observation.revision === expectation.projection.revision &&
    observation.projectionDigest === expectation.projection.digest;
}

async function reloadAndObserve(
  dependencies: PluginLifecycleServiceDependencies,
  scope: ScopeContext,
  plugin: PluginKey,
  transition: import("../domain/state/references.js").PendingTransitionRef,
  expectation: ProjectionExpectation,
  signal: AbortSignal,
): Promise<Readonly<{ ok: true; observation: ActivationObservation }> | Readonly<{ ok: false; failure: LifecycleActivationFailure }>> {
  try {
    const reloadResult = LifecycleReloadResultSchema.parse(await dependencies.reload.reload({ scope: toScopeReference(scope), transition }, signal));
    if (reloadResult.kind === "failed") return { ok: false, failure: { kind: "reload-rejected", code: "RELOAD_REJECTED" } };
    const observation = ActivationObservationSchema.parse(await dependencies.reload.observe({ scope: toScopeReference(scope), plugin }, signal));
    if (!observationMatches(observation, expectation, plugin)) {
      return { ok: false, failure: { kind: "observation-mismatch", code: "OBSERVATION_MISMATCH" } };
    }
    return { ok: true, observation };
  } catch (error) {
    return { ok: false, failure: safeFailure(error) };
  }
}

function candidateForOperation(
  operation: LifecycleOperation,
  previous: InstalledPluginRecord,
  prepared: PreparedPluginCandidate | undefined,
  _sha256: Sha256,
): InstalledPluginRecord {
  if (operation === "disable" || operation === "uninstall") {
    return InstalledPluginRecordSchema.parse({ ...withoutPending(previous), activation: "disabled" });
  }
  if (prepared === undefined) throw new Error("activation candidate is missing");
  return prepared.record;
}

function operationOrigin(request: { origin?: LifecycleOrigin }): LifecycleOrigin {
  return LifecycleOriginSchema.parse(request.origin ?? "manual");
}

function retainedData(request: UninstallPluginRequest | DisablePluginRequest): LifecycleRetainedData {
  return LifecycleRetainedDataSchema.parse("retainedData" in request ? request.retainedData ?? "keep" : "keep");
}

function noOp(operation: LifecycleOperation, snapshot: GenerationSnapshot): PluginLifecycleResult {
  return { kind: "unchanged", operation, snapshot };
}

function rejected(operation: LifecycleOperation, code: LifecycleRejectionCode): PluginLifecycleResult {
  return { kind: "rejected", operation, code: LifecycleRejectionCodeSchema.parse(code) };
}

function recovery(
  operation: LifecycleOperation,
  transition: import("../domain/state/references.js").PendingTransitionRef,
  committed?: Generation,
): PluginLifecycleResult {
  return committed === undefined
    ? { kind: "recovery-required", operation, transition }
    : { kind: "recovery-required", operation, transition, committed };
}

export function createPluginLifecycleService(
  dependencies: PluginLifecycleServiceDependencies,
): PluginLifecycleService {
  if (dependencies === null || typeof dependencies !== "object") throw new TypeError("lifecycle service dependencies are required");
  const preparation: PluginCandidatePreparationDependencies = dependencies;
  const reconciler = createLifecycleTransitionReconciler({
    state: dependencies.state,
    mutations: dependencies.mutations,
    reload: dependencies.reload,
    transitions: dependencies.transitions,
    sha256: dependencies.sha256,
  });

  async function load(scope: ScopeContext, signal: AbortSignal): Promise<GenerationSnapshot | undefined> {
    const result = await dependencies.state.read(scope, signal);
    return result.ok ? result.snapshot : undefined;
  }

  async function trustFor(scope: ScopeContext, requestRecords: readonly TrustStateRecord[] | undefined, signal: AbortSignal): Promise<readonly TrustStateRecord[]> {
    if (requestRecords !== undefined) return requestRecords;
    const snapshot = await load({ kind: "user" }, signal);
    return snapshot !== undefined && "trust" in snapshot ? snapshot.trust.records : [];
  }

  async function runFirstCommit(
    operation: LifecycleOperation,
    scope: ScopeContext,
    plugin: PluginKey,
    before: GenerationSnapshot,
    previous: InstalledPluginRecord | undefined,
    candidate: InstalledPluginRecord,
    prepared: PreparedPluginCandidate | undefined,
    reference: import("../domain/state/references.js").PendingTransitionRef,
    signal: AbortSignal,
  ): Promise<Readonly<{ kind: "committed"; snapshot: GenerationSnapshot }> | Readonly<{ kind: "stale"; expected: Generation; actual: Generation }> | Readonly<{ kind: "rejected"; code: LifecycleRejectionCode }> | Readonly<{ kind: "recovery"; committed?: Generation }>> {
    let expected = before.generation;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await dependencies.mutations.runPreparedMutation(
          { scope, plugins: [plugin], expectedGeneration: expected },
          async (context) => {
            await context.assertOwned();
            const current = targetRecord(context.snapshot, plugin);
            if (!sameJson(current, previous)) throw new GuardMismatch(context.snapshot.generation);
            let promotion: PromotionResult | undefined;
            if (prepared?.promotion !== undefined) {
              try {
                promotion = await dependencies.content.promote(prepared.promotion, signal);
              } catch {
                throw new PromotionFailure();
              }
              if (!sameJson(promotion.identity, prepared.promotion.identity) || !sameJson(promotion.manifest, prepared.promotion.manifest)) {
                throw new PromotionFailure();
              }
            }
            return {
              mutation: replaceTarget(context.snapshot, plugin, withPending(candidate, reference, dependencies.sha256), dependencies.sha256),
              value: promotion,
            };
          },
          signal,
        );
        if (result.kind === "committed") return { kind: "committed", snapshot: result.snapshot };
        if (result.kind === "stale-generation") {
          if (attempt === 1) return { kind: "stale", expected: result.expected, actual: result.actual };
          const fresh = await load(scope, signal);
          if (fresh === undefined) return { kind: "recovery" };
          if (targetRecord(fresh, plugin) !== undefined && !sameJson(targetRecord(fresh, plugin), previous)) {
            return { kind: "stale", expected: expected, actual: fresh.generation };
          }
          if (targetRecord(fresh, plugin) === undefined && previous !== undefined) {
            return { kind: "stale", expected: expected, actual: fresh.generation };
          }
          expected = fresh.generation;
          continue;
        }
        if (result.kind === "commit-failed") return { kind: "rejected", code: "MALFORMED" };
            return result.actual === undefined
          ? { kind: "recovery" }
          : { kind: "recovery", committed: result.actual };
      } catch (error) {
        if (signal.aborted) return { kind: "rejected", code: "ABORTED" };
        if (error instanceof GuardMismatch) return { kind: "stale", expected, actual: error.generation };
        if (error instanceof PromotionFailure) return { kind: "rejected", code: "PROMOTION_FAILED" };
        return { kind: "recovery" };
      }
    }
    return { kind: "stale", expected, actual: expected };
  }

  async function execute(
    operation: LifecycleOperation,
    request: InstallPluginRequest | EnablePluginRequest | DisablePluginRequest | UninstallPluginRequest,
    signal: AbortSignal,
  ): Promise<PluginLifecycleResult> {
    LifecycleOperationSchema.parse(operation);
    if (signal.aborted) return rejected(operation, "ABORTED");
    const scope = asScopeContext(request.scope, dependencies.sha256);
    const plugin = PluginKeySchema.parse(request.plugin);
    const origin = operationOrigin(request);
    let initial: GenerationSnapshot | undefined;
    try {
      initial = await load(scope, signal);
    } catch {
      return rejected(operation, signal.aborted ? "ABORTED" : "MALFORMED");
    }
    if (initial === undefined) return rejected(operation, "MALFORMED");
    const previous = targetRecord(initial, plugin);
    if (previous?.pendingTransition !== undefined) return rejected(operation, "PENDING_TRANSITION");

    if (operation === "enable" && (previous === undefined || previous.activation === "enabled")) {
      return previous === undefined ? rejected(operation, "NOT_INSTALLED") : noOp(operation, initial);
    }
    if (operation === "disable" && (previous === undefined || previous.activation === "disabled")) {
      return previous === undefined ? rejected(operation, "NOT_INSTALLED") : noOp(operation, initial);
    }
    if (operation === "update" && previous === undefined) return rejected(operation, "NOT_INSTALLED");
    if (operation === "uninstall" && previous === undefined) return noOp(operation, initial);

    const trustRecords = operation === "install" || operation === "update" || operation === "enable"
      ? ("trustRecords" in request && request.trustRecords !== undefined
        ? request.trustRecords
        : "trust" in initial
          ? initial.trust.records
          : await trustFor(scope, undefined, signal))
      : [];
    let prepared: PreparedPluginCandidate | undefined;
    let candidateExpectation: ProjectionExpectation;
    try {
      if (operation === "install" || operation === "update") {
        const installRequest = request as InstallPluginRequest;
        const candidateRequest: PluginCandidatePreparationRequest = {
          operation,
          scope,
          entry: installRequest.entry,
          marketplaceSource: installRequest.marketplaceSource,
          sourceContext: installRequest.sourceContext,
          trustRecords,
          configurationPathContext: installRequest.configurationPathContext,
          ...(previous === undefined ? {} : { existing: previous }),
        };
        const result = await preparePluginCandidate(preparation, candidateRequest, signal);
        if (result.kind === "rejected") return rejected(operation, mapPreparationCode(result.code));
        prepared = result.candidate;
        if (prepared.plugin !== plugin) {
          await discardCandidate(dependencies, prepared);
          return rejected(operation, "MALFORMED");
        }
        if (operation === "install" && previous !== undefined) {
          if (previous.selectedRevision === prepared.record.selectedRevision && previous.activation === "enabled") {
            await discardCandidate(dependencies, prepared);
            return noOp(operation, initial);
          }
          await discardCandidate(dependencies, prepared);
          return rejected(operation, "ALREADY_INSTALLED");
        }
        if (operation === "update" && previous !== undefined && previous.selectedRevision === prepared.record.selectedRevision && previous.activation === "enabled") {
          await discardCandidate(dependencies, prepared);
          return noOp(operation, initial);
        }
        candidateExpectation = prepared.projection;
      } else if (operation === "enable") {
        if (previous === undefined) return rejected(operation, "NOT_INSTALLED");
        const enableRequest = request as EnablePluginRequest;
        const result = await prepareEnableCandidate(preparation, {
          operation: "enable",
          scope,
          installed: previous,
          trustRecords,
          configurationPathContext: enableRequest.configurationPathContext,
        } satisfies EnableCandidatePreparationRequest, signal);
        if (result.kind === "rejected") return rejected(operation, mapPreparationCode(result.code));
        prepared = result.candidate;
        candidateExpectation = prepared.projection;
      } else {
        candidateExpectation = await prepareInactiveProjection(dependencies, { scope, plugin }, signal);
      }
    } catch (error) {
      await discardCandidate(dependencies, prepared);
      return rejected(operation, signal.aborted ? "ABORTED" : "PROJECTION_FAILED");
    }

    const previousExpectation = await preparePreviousExpectation(dependencies, scope, plugin, previous, signal).catch(() => undefined);
    if (previousExpectation === undefined) {
      await discardCandidate(dependencies, prepared);
      return rejected(operation, "MALFORMED");
    }

    let operationId: string;
    try {
      operationId = await dependencies.operationIds.create(signal);
      z.string().uuid().parse(operationId);
    } catch {
      await discardCandidate(dependencies, prepared);
      return rejected(operation, signal.aborted ? "ABORTED" : "MALFORMED");
    }
    const reference = (await import("./plugin-lifecycle-contract.js")).deriveLifecyclePendingTransitionRef({
      operationId,
      scope: toScopeReference(scope),
      plugin,
      startingGeneration: initial.generation,
    }, dependencies.sha256);
    const candidateSource = previous ?? prepared?.record;
    if (candidateSource === undefined) {
      await discardCandidate(dependencies, prepared);
      return rejected(operation, "MALFORMED");
    }
    const candidate = candidateForOperation(operation, candidateSource, prepared, dependencies.sha256);
    const finalRecord = operation === "uninstall" ? null : candidate;
    const transition: LifecycleTransitionRecord = createLifecycleTransitionRecord({
      operationId,
      operation,
      origin,
      scope: toScopeReference(scope),
      plugin,
      startingGeneration: initial.generation,
      previous: previous === undefined ? null : withoutPending(previous),
      candidate: withoutPending(candidate),
      final: finalRecord === null ? null : withoutPending(finalRecord),
      previousProjection: previousExpectation,
      candidateProjection: candidateExpectation,
      retainedData: operation === "uninstall" ? retainedData(request) : "keep",
      reference,
      sha256: dependencies.sha256,
    });
    try {
      const stored = await dependencies.transitions.prepare(transition, signal);
      if (stored === "already-present") {
        await discardCandidate(dependencies, prepared);
        return rejected(operation, "PENDING_TRANSITION");
      }
    } catch {
      await discardCandidate(dependencies, prepared);
      return rejected(operation, signal.aborted ? "ABORTED" : "MALFORMED");
    }

    const first = await runFirstCommit(operation, scope, plugin, initial, previous, candidate, prepared, reference, signal);
    await discardCandidate(dependencies, prepared);
    if (first.kind === "stale") return { kind: "stale", operation, expected: first.expected, actual: first.actual };
    if (first.kind === "rejected") return rejected(operation, first.code);
    if (first.kind === "recovery") return recovery(operation, reference, first.committed);

    const committed = first.snapshot;
    const activation = await reloadAndObserve(dependencies, scope, plugin, reference, candidateExpectation, signal);
    const reconciled = await reconciler.completeCommittedTransition({
      operation,
      scope,
      plugin,
      previous,
      candidate,
      final: finalRecord,
      reference,
      committed,
      previousProjection: previousExpectation,
      candidateProjection: candidateExpectation,
      activation,
    }, signal);
    if (reconciled.kind === "recovery-required") return recovery(operation, reference, reconciled.committed);
    if (reconciled.kind === "rolled-back") {
      return {
        kind: "rolled-back",
        operation,
        failure: reconciled.failure,
        snapshot: reconciled.snapshot,
        observation: reconciled.observation,
      };
    }
    return {
      kind: "changed",
      operation,
      snapshot: reconciled.snapshot,
      observation: reconciled.observation,
      ...(operation === "uninstall" ? { cleanup: { kind: "deferred", retainedData: retainedData(request) } } : {}),
    };
  }

  return {
    install: (request, signal) => execute("install", request, signal),
    enable: (request, signal) => execute("enable", request, signal),
    disable: (request, signal) => execute("disable", request, signal),
    update: (request, signal) => execute("update", request, signal),
    uninstall: (request, signal) => execute("uninstall", request, signal),
  };
}

export const PluginLifecycleResultSchema = z.object({
  kind: z.enum(["changed", "unchanged", "rejected", "stale", "rolled-back", "recovery-required"]),
}).passthrough().readonly();

export type {
  ActivationObservation,
  ConfigurationPathContext,
  Generation,
  GenerationSnapshot,
  InstalledPluginRecord,
  InstalledRevisionRecord,
  PluginKey,
  ProjectionExpectation,
  ScopeContext,
  ScopeReference,
};
