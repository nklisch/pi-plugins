import type { ContentDigest } from "../domain/content-manifest.js";
import type { Sha256 } from "../domain/source.js";
import {
  NativeLifecycleOperationCancellationResultSchema,
  NativeLifecycleOperationConfirmationSchema,
  NativeLifecycleOperationPreviewResultSchema,
  NativeLifecycleOperationPreviewSchema,
  NativeLifecycleOperationRequestSchema,
  NativeLifecycleOperationResultSchema,
  NativeLifecycleOperationSessionViewSchema,
  NativeLifecycleOperationStatusResultSchema,
  type NativeLifecycleExecutionOptions,
  type NativeLifecycleOperationConfirmation,
  type NativeLifecycleOperationPreviewResult,
  type NativeLifecycleOperationRequest,
  type NativeLifecycleOperationResult,
  type NativeLifecycleOperationService,
  type NativeLifecycleOperationSessionState,
  type NativeLifecycleRunOptions,
} from "./native-lifecycle-operation-contract.js";
import { deriveNativeLifecyclePreviewId } from "./native-lifecycle-operation-identifiers.js";
import type { NativeLifecycleTargetService } from "./native-lifecycle-target.js";
import type { NativeLifecycleUpdateService } from "./native-lifecycle-update.js";
import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { LifecycleOperationIdPort } from "./ports/lifecycle-operation-id.js";
import { createNativeLifecycleOperationSessionRegistry, type NativeLifecycleOperationSessionEntry } from "./native-lifecycle-operation-session.js";
import type { createNativeLifecycleOperationExecutor } from "./native-lifecycle-operation.js";
import type { ProjectSyncService } from "./project-sync-service.js";

export type NativeLifecycleOperationServiceDependencies = Readonly<{
  targets: NativeLifecycleTargetService;
  updates: NativeLifecycleUpdateService;
  lifecycle: ReturnType<typeof createNativeLifecycleOperationExecutor>;
  sync: ProjectSyncService;
  clock: LifecycleClock;
  sessionIds: LifecycleOperationIdPort;
  hostEpoch: ContentDigest;
  sha256: Sha256;
}>;

function stateFor(result: NativeLifecycleOperationResult): NativeLifecycleOperationSessionState {
  return result.kind;
}
function effects() { return { state: "unchanged" as const, projectFile: "unchanged" as const, completedActionIds: [], pendingActionIds: [] }; }

export function createNativeLifecycleOperationService(dependencies: NativeLifecycleOperationServiceDependencies): Readonly<{
  application: NativeLifecycleOperationService;
  quiesce(): void;
  close(): Promise<void>;
}> {
  if (dependencies === null || typeof dependencies !== "object" || typeof dependencies.sha256 !== "function") throw new TypeError("native lifecycle operation service dependencies are required");
  const sessions = createNativeLifecycleOperationSessionRegistry({ clock: dependencies.clock, sessionIds: dependencies.sessionIds, hostEpoch: dependencies.hostEpoch, sha256: dependencies.sha256 });

  function view(entry: NativeLifecycleOperationSessionEntry) {
    return NativeLifecycleOperationSessionViewSchema.parse({ token: entry.token, version: entry.version, state: entry.state, expiresAt: sessions.expiresAt(entry), preview: entry.preview, progress: entry.progress });
  }
  function immediateResult(request: NativeLifecycleOperationRequest, reason?: string): NativeLifecycleOperationResult {
    const previewId = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, request, current: true }, dependencies.sha256);
    if (request.operation === "project-sync") return NativeLifecycleOperationResultSchema.parse({ kind: "current-state", operation: request.operation, previewId, progress: [], diagnostics: [], effects: effects(), reason: "project-converged", syncDigest: reason });
    return NativeLifecycleOperationResultSchema.parse({ kind: "current-state", operation: request.operation, previewId, progress: [], diagnostics: [], effects: effects(), reason: request.operation === "enable" ? "already-enabled" : request.operation === "disable" ? "already-disabled" : request.operation === "update" ? "revision-current" : "already-uninstalled" });
  }

  async function preview(requestInput: NativeLifecycleOperationRequest, signal: AbortSignal): Promise<NativeLifecycleOperationPreviewResult> {
    if (!sessions.isAccepting()) return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "unavailable", code: "DISPOSED", diagnostics: [] });
    const request = NativeLifecycleOperationRequestSchema.parse(requestInput);
    await sessions.reap();
    if (request.operation === "project-sync") {
      const seed = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, request }, dependencies.sha256);
      const synced = await dependencies.sync.preview({ mode: request.mode, projectKey: request.projectKey, previewId: seed }, signal);
      if (synced.kind === "current-state") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "current-state", operation: request.operation, diagnostics: [] });
      if (synced.kind === "stale") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "stale", reason: synced.reason });
      if (synced.kind === "rejected") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "rejected", code: synced.code, diagnostics: [] });
      const previewId = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, request, plan: synced.plan }, dependencies.sha256);
      const previewValue = NativeLifecycleOperationPreviewSchema.parse({ previewId, operation: request.operation, admission: synced.plan.requiredActions.length > 0 ? "needs-action" : synced.plan.conflicts.length > 0 ? "needs-input" : "ready", sync: synced.plan, diagnostics: [] });
      const entry = await sessions.create(previewValue, { kind: "project-sync", context: synced.context }, signal);
      return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "opened", session: view(entry) });
    }

    if (request.operation === "update") {
      const prepared = await dependencies.updates.acquire({ target: request.target, candidate: request.candidate }, signal);
      if (prepared.kind === "current-state") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "current-state", operation: request.operation, diagnostics: [] });
      if (prepared.kind === "stale") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "stale", reason: prepared.reason });
      if (prepared.kind === "blocked") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "unavailable", code: "PENDING_TRANSITION", diagnostics: [] });
      if (prepared.kind !== "ready") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: prepared.kind, code: "AVAILABLE_REVISION_CHANGED", diagnostics: [] });
      const update = prepared.update;
      const previewId = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, operation: request.operation, target: update.target.binding, update: update.binding }, dependencies.sha256);
      const needsInput = update.candidate.fields.some((field) => field.required && field.state !== "configured" && field.state !== "defaulted");
      const previewValue = NativeLifecycleOperationPreviewSchema.parse({ previewId, operation: request.operation, admission: needsInput ? "needs-input" : "ready", target: update.target.binding, update: { candidate: update.candidate.binding, updateCandidate: update.binding.updateCandidate, fields: update.candidate.fields, consent: update.candidate.consent }, diagnostics: update.candidate.detail.diagnostics });
      try {
        const entry = await sessions.create(previewValue, { kind: "lifecycle", context: { operation: "update", previewId, target: update.target, update, diagnostics: update.candidate.detail.diagnostics } }, signal);
        return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "opened", session: view(entry) });
      } catch (error) { await update.candidate.lease.release(); throw error; }
    }

    const resolved = await dependencies.targets.resolve(request.target, signal);
    if (resolved.kind === "stale") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "stale", reason: resolved.reason });
    if (resolved.kind === "blocked") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "unavailable", code: "PENDING_TRANSITION", diagnostics: [] });
    if (resolved.kind !== "ready") return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "unavailable", code: "ADAPTER_FAILED", diagnostics: [] });
    if (request.operation === "enable" && resolved.target.binding.activation === "enabled" || request.operation === "disable" && resolved.target.binding.activation === "disabled") {
      return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "current-state", operation: request.operation, diagnostics: [] });
    }
    const previewId = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, operation: request.operation, target: resolved.target.binding }, dependencies.sha256);
    const previewValue = NativeLifecycleOperationPreviewSchema.parse({ previewId, operation: request.operation, admission: "ready", target: resolved.target.binding, diagnostics: [] });
    const entry = await sessions.create(previewValue, { kind: "lifecycle", context: { operation: request.operation, previewId, target: resolved.target } }, signal);
    return NativeLifecycleOperationPreviewResultSchema.parse({ kind: "opened", session: view(entry) });
  }

  function validationFailure(entry: NativeLifecycleOperationSessionEntry, kind: "stale" | "conflict", reason: "session" | "operation-in-progress"): NativeLifecycleOperationResult {
    return NativeLifecycleOperationResultSchema.parse({ kind, operation: entry.preview.operation, previewId: entry.preview.previewId, progress: entry.progress, diagnostics: [], effects: effects(), reason });
  }
  function confirmationMatches(entry: NativeLifecycleOperationSessionEntry, confirmation: NativeLifecycleOperationConfirmation): boolean {
    if (confirmation.previewId !== entry.preview.previewId || confirmation.expectedVersion !== entry.version) return false;
    if (confirmation.kind === "deny") return true;
    return entry.preview.operation === "update" ? confirmation.kind === "confirm-update"
      : entry.preview.operation === "uninstall" ? confirmation.kind === "confirm-uninstall"
      : entry.preview.operation === "project-sync" ? confirmation.kind === "confirm-project-sync"
      : confirmation.kind === "confirm" && confirmation.operation === entry.preview.operation;
  }

  async function apply(request: Parameters<NativeLifecycleOperationService["apply"]>[0], options: NativeLifecycleExecutionOptions, callerSignal: AbortSignal): Promise<NativeLifecycleOperationResult> {
    if (!sessions.isAccepting()) return NativeLifecycleOperationResultSchema.parse({ kind: "disposed" });
    const confirmation = NativeLifecycleOperationConfirmationSchema.parse(request.confirmation);
    const lookup = await sessions.lookup(request.token);
    if (lookup.kind !== "found") return NativeLifecycleOperationResultSchema.parse({ kind: lookup.kind });
    const entry = lookup.entry;
    if (entry.result !== undefined) return entry.result;
    if (entry.state === "applying") return validationFailure(entry, "conflict", "operation-in-progress");
    if (!confirmationMatches(entry, confirmation)) return validationFailure(entry, "stale", "session");
    if (confirmation.kind === "deny") {
      entry.version += 1;
      const cancelled = NativeLifecycleOperationResultSchema.parse({ kind: "cancelled", operation: entry.preview.operation, previewId: entry.preview.previewId, progress: entry.progress, diagnostics: [], effects: effects(), phase: "preflight" });
      sessions.finish(entry, "cancelled", cancelled);
      await sessions.release(entry).catch(() => undefined);
      return cancelled;
    }
    entry.state = "applying";
    entry.version += 1;
    const signal = AbortSignal.any([callerSignal, entry.controller.signal]);
    const forwarded = async (event: Parameters<NonNullable<NativeLifecycleExecutionOptions["onProgress"]>>[0]) => {
      entry.progress = Object.freeze([...entry.progress, event].slice(-128));
      await options.onProgress?.(event);
    };
    let settleCompletion!: () => void;
    entry.completion = new Promise<void>((resolve) => { settleCompletion = resolve; });
    try {
      let result: NativeLifecycleOperationResult;
      if (entry.execution.kind === "lifecycle") result = await dependencies.lifecycle.execute(entry.execution.context, confirmation, { onProgress: forwarded }, signal);
      else {
        if (confirmation.kind !== "confirm-project-sync") result = validationFailure(entry, "stale", "session");
        else {
          const projected = await dependencies.sync.apply({ context: entry.execution.context, resolutions: confirmation.resolutions }, forwarded, signal);
          result = "previewId" in projected ? NativeLifecycleOperationResultSchema.parse({ ...projected, previewId: entry.preview.previewId }) : projected;
        }
      }
      sessions.finish(entry, stateFor(result), result);
      await sessions.release(entry).catch(() => undefined);
      return result;
    } catch (error) {
      const result = signal.aborted
        ? NativeLifecycleOperationResultSchema.parse({ kind: "cancelled", operation: entry.preview.operation, previewId: entry.preview.previewId, progress: entry.progress, diagnostics: [], effects: effects(), phase: "preflight" })
        : NativeLifecycleOperationResultSchema.parse({ kind: "failed", operation: entry.preview.operation, previewId: entry.preview.previewId, progress: entry.progress, diagnostics: [], effects: effects(), code: "ADAPTER_FAILED" });
      sessions.finish(entry, stateFor(result), result);
      await sessions.release(entry).catch(() => undefined);
      return result;
    } finally { settleCompletion(); delete entry.completion; }
  }

  const application: NativeLifecycleOperationService = Object.freeze({
    preview,
    apply,
    async run(request: Parameters<NativeLifecycleOperationService["run"]>[0], options: NativeLifecycleRunOptions, signal: AbortSignal) {
      const opened = await preview(request, signal);
      if (opened.kind === "current-state") {
        if (request.operation !== "project-sync") return immediateResult(request);
        const seed = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, request, current: true }, dependencies.sha256);
        const current = await dependencies.sync.preview({ mode: request.mode, projectKey: request.projectKey, previewId: seed }, signal);
        return current.kind === "current-state"
          ? immediateResult(request, current.digest)
          : NativeLifecycleOperationResultSchema.parse({ kind: "stale", operation: request.operation, previewId: seed, progress: [], diagnostics: [], effects: effects(), reason: "project" });
      }
      if (opened.kind !== "opened") {
        const previewId = deriveNativeLifecyclePreviewId({ hostEpoch: dependencies.hostEpoch, request, outcome: opened }, dependencies.sha256);
        return NativeLifecycleOperationResultSchema.parse({ kind: opened.kind === "stale" ? "stale" : "rejected", operation: request.operation, previewId, progress: [], diagnostics: "diagnostics" in opened ? opened.diagnostics : [], effects: effects(), ...(opened.kind === "stale" ? { reason: opened.reason } : { code: opened.code }) });
      }
      let decision;
      try { decision = await options.decisionProvider(opened.session, signal); }
      catch (error) {
        if (signal.aborted) decision = { kind: "cancelled" as const };
        else return NativeLifecycleOperationResultSchema.parse({ kind: "failed", operation: request.operation, previewId: opened.session.preview.previewId, progress: [], diagnostics: [], effects: effects(), code: "ADAPTER_FAILED" });
      }
      if (decision.kind === "cancelled") {
        const confirmation = { kind: "deny" as const, previewId: opened.session.preview.previewId, expectedVersion: opened.session.version };
        return apply({ token: opened.session.token, confirmation }, options, signal);
      }
      return apply({ token: opened.session.token, confirmation: decision }, options, signal);
    },
    async status(request: Parameters<NativeLifecycleOperationService["status"]>[0], signal: AbortSignal) {
      signal.throwIfAborted();
      const lookup = await sessions.lookup(request.token);
      if (lookup.kind !== "found") return NativeLifecycleOperationStatusResultSchema.parse({ kind: lookup.kind });
      return NativeLifecycleOperationStatusResultSchema.parse({ kind: "found", session: view(lookup.entry), ...(lookup.entry.result === undefined ? {} : { result: lookup.entry.result }) });
    },
    async cancel(request: Parameters<NativeLifecycleOperationService["cancel"]>[0], signal: AbortSignal) {
      signal.throwIfAborted();
      const lookup = await sessions.lookup(request.token, false);
      if (lookup.kind !== "found") return NativeLifecycleOperationCancellationResultSchema.parse({ kind: lookup.kind });
      const entry = lookup.entry;
      entry.controller.abort(new DOMException("native operation cancelled", "AbortError"));
      if (entry.state !== "applying" && entry.result === undefined) {
        const result = NativeLifecycleOperationResultSchema.parse({ kind: "cancelled", operation: entry.preview.operation, previewId: entry.preview.previewId, progress: entry.progress, diagnostics: [], effects: effects(), phase: "preflight" });
        sessions.finish(entry, "cancelled", result);
        await sessions.release(entry).catch(() => undefined);
      }
      return NativeLifecycleOperationCancellationResultSchema.parse({ kind: "accepted", state: entry.state });
    },
  });

  return Object.freeze({ application, quiesce: sessions.quiesce, close: sessions.close });
}
