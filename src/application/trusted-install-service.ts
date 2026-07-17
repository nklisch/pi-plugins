import { compareUtf8 } from "../domain/canonical-json.js";
import type { ContentDigest } from "../domain/content-manifest.js";
import type { ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import type { BoundPluginConfigurationService } from "./configuration-service.js";
import type { ExactTrustGrantService } from "./exact-trust-grant-service.js";
import type { LifecycleOperationIdPort } from "./ports/lifecycle-operation-id.js";
import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { NativeInspectionEvidencePort } from "./ports/native-inspection-evidence.js";
import type { ProjectRootAuthorityPort, TrustedProjectRoot } from "./ports/project-root-authority.js";
import type { TrustedInstallCandidate, TrustedInstallCandidateService } from "./trusted-install-candidate.js";
import {
  TrustedInstallActivationResultSchema,
  TrustedInstallCancellationResultSchema,
  TrustedInstallOpenRequestSchema,
  TrustedInstallOpenResultSchema,
  TrustedInstallSessionViewSchema,
  TrustedInstallStatusResultSchema,
  TrustedInstallSubmissionSchema,
  type TrustedInstallActivationResult,
  type TrustedInstallExecutionOptions,
  type TrustedInstallationService,
  type TrustedInstallInputIssue,
  type TrustedInstallProgressEvent,
  type TrustedInstallRunOptions,
  type TrustedInstallSessionState,
  type TrustedInstallSessionView,
} from "./trusted-install-contract.js";
import { deriveInspectionEvidenceSnapshotId, decodeInspectionDetailId } from "./native-inspection-identifiers.js";
import { createTrustedInstallSessionRegistry, type TrustedInstallSessionEntry } from "./trusted-install-session.js";
import { validateTrustedInstallSubmission, type TrustedInstallConfigurationDependencies } from "./trusted-install-configuration.js";
import type { TrustedInstallConfigurationAuthorityResult } from "./trusted-install-configuration.js";
import { executeTrustedInstallLifecycle, type TrustedInstallLifecycleDependencies, type TrustedInstallLifecycleResult } from "./trusted-install-lifecycle.js";

export type TrustedInstallationServiceDependencies = Readonly<{
  candidate: TrustedInstallCandidateService;
  configuration: BoundPluginConfigurationService;
  configurationAuthority: Readonly<{
    readExact(request: Readonly<{ configurationRef: import("../domain/state/references.js").PluginConfigurationRef; descriptors: import("../domain/configuration.js").PluginConfiguration; expectedRevision: string }>, signal: AbortSignal): Promise<TrustedInstallConfigurationAuthorityResult>;
  }>;
  configurationInput(candidate: TrustedInstallCandidate, projectRoot: TrustedProjectRoot | undefined): Omit<TrustedInstallConfigurationDependencies, "configurationRef" | "plugin" | "scope" | "descriptors">;
  trust: ExactTrustGrantService;
  lifecycle: TrustedInstallLifecycleDependencies;
  evidence: NativeInspectionEvidencePort;
  projectRoots: ProjectRootAuthorityPort;
  clock: LifecycleClock;
  sessionIds: LifecycleOperationIdPort;
  hostEpoch: ContentDigest;
  sha256: Sha256;
}>;

function sortedIssues(input: readonly TrustedInstallInputIssue[]): readonly TrustedInstallInputIssue[] {
  const unique = new Map(input.map((issue) => [`${issue.key ?? ""}\0${issue.code}`, issue]));
  return Object.freeze([...unique.values()].sort((left, right) => {
    const key = compareUtf8(left.key ?? "", right.key ?? "");
    return key !== 0 ? key : compareUtf8(left.code, right.code);
  }));
}

function resultState(result: TrustedInstallActivationResult): TrustedInstallSessionState {
  return result.kind === "needs-input" ? "awaiting-input" : result.kind;
}

export function createTrustedInstallationService(dependencies: TrustedInstallationServiceDependencies): Readonly<{
  application: TrustedInstallationService;
  quiesce(): void;
  close(): Promise<void>;
}> {
  if (dependencies === null || typeof dependencies !== "object" || typeof dependencies.sha256 !== "function") throw new TypeError("trusted installation dependencies are required");
  const registry = createTrustedInstallSessionRegistry({ clock: dependencies.clock, sessionIds: dependencies.sessionIds, hostEpoch: dependencies.hostEpoch, sha256: dependencies.sha256 });
  let quiesced = false;

  function progress(entry: TrustedInstallSessionEntry, phase: TrustedInstallProgressEvent["phase"], state: TrustedInstallProgressEvent["state"], options?: TrustedInstallExecutionOptions, code?: string): void {
    const event = Object.freeze({
      sequence: entry.progress.length === 0 ? 0 : entry.progress.at(-1)!.sequence + 1,
      phase, state, plugin: entry.candidate.binding.plugin, scope: entry.candidate.binding.scope,
      revision: entry.candidate.binding.immutableRevision,
      ...(code === undefined ? {} : { code }),
    }) as TrustedInstallProgressEvent;
    entry.progress.push(event);
    while (entry.progress.length > 32) entry.progress.shift();
    if (options?.onProgress !== undefined) {
      Promise.resolve().then(() => options.onProgress!(event)).catch(() => {
        const delivery = Object.freeze({ ...event, sequence: entry.progress.at(-1)!.sequence + 1, state: "failed" as const, code: "PROGRESS_DELIVERY_FAILED" });
        entry.progress.push(delivery);
        while (entry.progress.length > 32) entry.progress.shift();
      });
    }
  }

  function view(entry: TrustedInstallSessionEntry): TrustedInstallSessionView {
    return TrustedInstallSessionViewSchema.parse({
      token: entry.token,
      version: entry.version,
      state: entry.state,
      expiresAt: registry.expiresAt(entry),
      binding: entry.candidate.binding,
      candidate: entry.candidate.detail,
      fields: entry.candidate.fields,
      consent: entry.candidate.consent,
      progress: entry.progress,
      retained: entry.retained,
    });
  }

  async function finish(entry: TrustedInstallSessionEntry, resultInput: TrustedInstallActivationResult): Promise<TrustedInstallActivationResult> {
    const result = TrustedInstallActivationResultSchema.parse(resultInput);
    registry.finish(entry, resultState(result), result);
    await entry.candidate.lease.release();
    return result;
  }

  function safeRetained(entry: TrustedInstallSessionEntry) { return { ...entry.retained }; }
  function conflict(entry: TrustedInstallSessionEntry, reason: "already-installed-different-revision" | "operation-in-progress" | "pending-transition" | "concurrent-mutation"): TrustedInstallActivationResult {
    return TrustedInstallActivationResultSchema.parse({ kind: "conflict", reason, progress: entry.progress, retained: safeRetained(entry) });
  }
  function stale(entry: TrustedInstallSessionEntry, reason: "session" | "candidate" | "configuration" | "consent" | "project" | "capability"): TrustedInstallActivationResult {
    return TrustedInstallActivationResultSchema.parse({ kind: "stale", reason, progress: entry.progress, retained: safeRetained(entry) });
  }
  function cancelled(entry: TrustedInstallSessionEntry, phase: TrustedInstallProgressEvent["phase"]): TrustedInstallActivationResult {
    return TrustedInstallActivationResultSchema.parse({ kind: "cancelled", phase, progress: entry.progress, retained: safeRetained(entry) });
  }

  async function projectRoot(candidate: TrustedInstallCandidate, signal: AbortSignal): Promise<TrustedProjectRoot | undefined> {
    if (candidate.binding.scope.kind === "user") return undefined;
    const root = await dependencies.projectRoots.acquire(signal);
    const scope = candidate.resolved.scope;
    dependencies.projectRoots.verify(root, scope);
    if (dependencies.projectRoots.revalidate !== undefined) await dependencies.projectRoots.revalidate(root, scope, signal);
    return root;
  }

  async function terminalFromLifecycle(entry: TrustedInstallSessionEntry, lifecycle: TrustedInstallLifecycleResult): Promise<TrustedInstallActivationResult> {
    if (lifecycle.kind === "current-state") {
      progress(entry, "activation-observation", "completed");
      return finish(entry, { kind: "current-state", plugin: entry.candidate.binding.plugin, scope: entry.candidate.binding.scope, revision: lifecycle.revision, activation: lifecycle.activation, reason: "already-active", progress: entry.progress, retained: safeRetained(entry) });
    }
    if (lifecycle.kind === "conflict") return finish(entry, conflict(entry, lifecycle.reason));
    if (lifecycle.kind === "recovery-required") return finish(entry, { kind: "recovery-required", action: "run-recovery", progress: entry.progress, retained: safeRetained(entry) });
    const result = lifecycle.result;
    if (result.kind === "changed") {
      if (lifecycle.enabledExisting) {
        return finish(entry, { kind: "current-state", plugin: entry.candidate.binding.plugin, scope: entry.candidate.binding.scope, revision: entry.candidate.binding.immutableRevision, activation: "enabled", reason: "enabled-existing", progress: entry.progress, retained: safeRetained(entry) });
      }
      const observation = result.observation;
      if (observation.kind !== "active" || observation.plugin !== entry.candidate.binding.plugin || observation.revision !== entry.candidate.binding.immutableRevision || JSON.stringify(observation.scope) !== JSON.stringify(entry.candidate.binding.scope)) {
        return finish(entry, { kind: "recovery-required", action: "run-recovery", progress: entry.progress, retained: safeRetained(entry) });
      }
      progress(entry, "activation-observation", "completed");
      progress(entry, "completed", "completed");
      const counts = entry.candidate.detail.compatibility.components.counts;
      return finish(entry, {
        kind: "succeeded", plugin: entry.candidate.binding.plugin, scope: entry.candidate.binding.scope,
        revision: entry.candidate.binding.immutableRevision, projectionDigest: observation.projectionDigest,
        components: { skills: counts.skills, hooks: counts.hooks, mcpServers: counts.mcpServers },
        progress: entry.progress, diagnostics: entry.candidate.detail.diagnostics, retained: safeRetained(entry),
      });
    }
    if (result.kind === "unchanged") return finish(entry, { kind: "current-state", plugin: entry.candidate.binding.plugin, scope: entry.candidate.binding.scope, revision: entry.candidate.binding.immutableRevision, activation: "enabled", reason: "already-active", progress: entry.progress, retained: safeRetained(entry) });
    if (result.kind === "stale") return finish(entry, conflict(entry, "concurrent-mutation"));
    if (result.kind === "rolled-back") return finish(entry, { kind: "rolled-back", failure: result.failure.kind, restored: true, progress: entry.progress, retained: safeRetained(entry) });
    if (result.kind === "recovery-required") return finish(entry, { kind: "recovery-required", transition: result.transition, ...(result.committed === undefined ? {} : { committed: result.committed }), action: "run-recovery", progress: entry.progress, retained: safeRetained(entry) });
    if (result.code === "ABORTED") return finish(entry, cancelled(entry, "activation-transaction"));
    if (result.code === "AVAILABLE_REVISION_CHANGED") return finish(entry, stale(entry, "candidate"));
    if (result.code === "ALREADY_INSTALLED") return finish(entry, conflict(entry, "already-installed-different-revision"));
    if (result.code === "PENDING_TRANSITION") return finish(entry, conflict(entry, "pending-transition"));
    return finish(entry, { kind: "rejected", code: result.code, diagnostics: entry.candidate.detail.diagnostics, progress: entry.progress, retained: safeRetained(entry) });
  }

  async function open(requestInput: unknown, signal: AbortSignal) {
    if (quiesced) return TrustedInstallOpenResultSchema.parse({ kind: "unavailable", code: "DISPOSED", diagnostics: [] });
    const request = TrustedInstallOpenRequestSchema.parse(requestInput);
    await registry.reap();
    const snapshot = await dependencies.evidence.capture(signal).catch((error) => {
      if (signal.aborted) throw signal.reason ?? error;
      return undefined;
    });
    if (snapshot === undefined) return TrustedInstallOpenResultSchema.parse({ kind: "unavailable", code: "EVIDENCE_UNAVAILABLE", diagnostics: [] });
    if (deriveInspectionEvidenceSnapshotId(snapshot.binding, dependencies.sha256) !== request.inspectionSnapshotId) return TrustedInstallOpenResultSchema.parse({ kind: "stale", reason: "candidate" });
    const subject = decodeInspectionDetailId(request.detailId, dependencies.sha256);
    if (subject === undefined || subject.subject !== "marketplace-candidate") return TrustedInstallOpenResultSchema.parse({ kind: "stale", reason: "candidate" });
    const acquired = await dependencies.candidate.acquire({ subject, snapshot }, signal);
    if (acquired.kind !== "ready") {
      if (acquired.kind === "stale") return TrustedInstallOpenResultSchema.parse({ kind: "stale", reason: "candidate" });
      return TrustedInstallOpenResultSchema.parse({ kind: acquired.kind, code: acquired.kind === "unavailable" ? "CANDIDATE_UNAVAILABLE" : "CANDIDATE_REJECTED", diagnostics: acquired.diagnostics });
    }
    const entry = await registry.create(acquired.candidate, signal);
    progress(entry, "candidate-acquisition", "completed");
    return TrustedInstallOpenResultSchema.parse({ kind: "opened", session: view(entry) });
  }

  async function activate(request: Readonly<{ token: import("./trusted-install-contract.js").TrustedInstallSessionToken; submission: import("./trusted-install-contract.js").TrustedInstallSubmission }>, options: TrustedInstallExecutionOptions, callerSignal: AbortSignal): Promise<TrustedInstallActivationResult> {
    const lookup = await registry.lookup(request.token);
    if (lookup.kind !== "found") return TrustedInstallActivationResultSchema.parse({ kind: lookup.kind });
    const entry = lookup.entry;
    if (entry.result !== undefined) return entry.result;
    if (entry.state === "activating") return conflict(entry, "operation-in-progress");
    const submission = TrustedInstallSubmissionSchema.parse(request.submission);
    if (submission.expectedVersion !== entry.version) return stale(entry, "session");
    entry.state = "activating";
    entry.version += 1;
    const signal = AbortSignal.any([callerSignal, entry.controller.signal]);
    let phase: TrustedInstallProgressEvent["phase"] = "input-validation";
    let lifecycleStarted = false;
    try {
      progress(entry, phase, "started", options);
      const candidateCurrent = await dependencies.candidate.validate(entry.candidate, signal);
      const evidenceCurrent = await dependencies.evidence.validate(entry.candidate.snapshotBinding, signal);
      if (candidateCurrent !== "current") return finish(entry, stale(entry, "candidate"));
      if (evidenceCurrent !== "current") return finish(entry, stale(entry, entry.candidate.binding.scope.kind === "project" ? "project" : "capability"));

      const issues: TrustedInstallInputIssue[] = [];
      if (submission.consent.consentId !== entry.candidate.consent.consentId) issues.push({ code: "CONSENT_STALE" });
      if (submission.consent.kind === "grant" && submission.consent.consentId === entry.candidate.consent.consentId) {
        // Configuration validation below supplies all field issues.
      }
      const root = await projectRoot(entry.candidate, signal);
      let configurationRequest: import("./configuration-service.js").SavePluginConfigurationRequest | undefined;
      if (entry.candidate.binding.configurationRef !== undefined) {
        const input = dependencies.configurationInput(entry.candidate, root);
        const validation = await validateTrustedInstallSubmission(entry.candidate.fields, submission, {
          ...input,
          configurationRef: entry.candidate.binding.configurationRef,
          plugin: entry.candidate.binding.plugin,
          scope: entry.candidate.resolved.scope,
          descriptors: entry.candidate.plugin.configuration,
        }, signal);
        if (validation.kind === "invalid") issues.push(...validation.issues);
        else configurationRequest = validation.request;
      } else if (submission.nonSensitive.length > 0 || submission.sensitive.length > 0) {
        for (const key of [...submission.nonSensitive, ...submission.sensitive].map((item) => item.key)) issues.push({ code: "CONFIG_UNKNOWN_KEY", key });
      }
      if (issues.length > 0) {
        progress(entry, phase, "failed", options, "INPUT_REQUIRED");
        registry.restore(entry);
        return TrustedInstallActivationResultSchema.parse({ kind: "needs-input", issues: sortedIssues(issues), session: view(entry) });
      }
      progress(entry, phase, "completed", options);
      if (submission.consent.kind === "deny") return finish(entry, cancelled(entry, phase));
      signal.throwIfAborted();

      if (configurationRequest !== undefined) {
        phase = "configuration-custody";
        progress(entry, phase, "started", options);
        if (entry.configurationRevision === undefined) {
          const saved = await dependencies.configuration.save(configurationRequest, signal);
          if (saved.kind === "stale" || saved.kind === "stale-with-cleanup-required") return finish(entry, stale(entry, "configuration"));
          if (saved.kind === "ambiguous-with-recovery-required" || saved.kind === "stored-with-cleanup-required") {
            entry.retained.configuration = saved.kind === "stored-with-cleanup-required";
            return finish(entry, { kind: "recovery-required", action: "run-recovery", progress: entry.progress, retained: safeRetained(entry) });
          }
          if (saved.kind === "secret-collision") return finish(entry, { kind: "rejected", code: saved.code, diagnostics: [], progress: entry.progress, retained: safeRetained(entry) });
          entry.configurationRevision = saved.document.revision;
          entry.retained.configuration = true;
        }
        progress(entry, phase, "completed", options);
      }
      signal.throwIfAborted();

      phase = "trust-decision";
      progress(entry, phase, "started", options);
      if (!entry.retained.trust) {
        const granted = await dependencies.trust.grant({ candidate: entry.candidate.trust, scope: entry.candidate.resolved.scope, ...(root === undefined ? {} : { projectRoot: root }) }, signal);
        if (granted.kind === "stale") return finish(entry, conflict(entry, "concurrent-mutation"));
        if (granted.kind === "project-stale") return finish(entry, stale(entry, "project"));
        if (granted.kind === "project-untrusted") return finish(entry, { kind: "rejected", code: "PROJECT_UNTRUSTED", diagnostics: [], progress: entry.progress, retained: safeRetained(entry) });
        if (granted.kind === "recovery-required") return finish(entry, { kind: "recovery-required", ...(granted.committed === undefined ? {} : { committed: granted.committed }), action: "run-recovery", progress: entry.progress, retained: safeRetained(entry) });
        entry.retained.trust = true;
      }
      progress(entry, phase, "completed", options);
      signal.throwIfAborted();

      if (await dependencies.candidate.validate(entry.candidate, signal) !== "current") return finish(entry, stale(entry, "candidate"));
      if (root !== undefined && dependencies.projectRoots.revalidate !== undefined) await dependencies.projectRoots.revalidate(root, entry.candidate.resolved.scope, signal);
      if (entry.candidate.binding.configurationRef !== undefined && entry.configurationRevision !== undefined) {
        const authority = await dependencies.configurationAuthority.readExact({ configurationRef: entry.candidate.binding.configurationRef, descriptors: entry.candidate.plugin.configuration, expectedRevision: entry.configurationRevision }, signal);
        if (authority.kind !== "current") return finish(entry, stale(entry, "configuration"));
      }

      phase = "activation-transaction";
      progress(entry, phase, "started", options);
      lifecycleStarted = true;
      const lifecycle = await executeTrustedInstallLifecycle(entry.candidate, dependencies.configurationInput(entry.candidate, root).pathContext, dependencies.lifecycle, signal);
      progress(entry, phase, "completed", options);
      return terminalFromLifecycle(entry, lifecycle);
    } catch (error) {
      if (signal.aborted && !lifecycleStarted) return finish(entry, cancelled(entry, phase));
      return finish(entry, { kind: "failed", code: lifecycleStarted ? "ADAPTER_FAILED" : "CLEANUP_FAILED", progress: entry.progress, retained: safeRetained(entry) });
    }
  }

  function missingInput(entry: TrustedInstallSessionEntry): TrustedInstallActivationResult {
    const issues: TrustedInstallInputIssue[] = entry.candidate.fields.flatMap((field) => field.required && field.state !== "configured" && field.state !== "defaulted"
      ? [{ code: field.sensitive && field.state === "unavailable" ? "SECRET_CUSTODY_UNAVAILABLE" as const : "CONFIG_REQUIRED" as const, key: field.key }]
      : []);
    issues.push({ code: "CONSENT_REQUIRED" });
    return TrustedInstallActivationResultSchema.parse({ kind: "needs-input", issues: sortedIssues(issues), session: view(entry) });
  }

  const application: TrustedInstallationService = Object.freeze({
    open,
    activate,
    async run(request: Parameters<TrustedInstallationService["run"]>[0], options: TrustedInstallRunOptions, signal: AbortSignal) {
      const opened = await open(request, signal);
      if (opened.kind !== "opened") {
        if (opened.kind === "stale") return { kind: "stale", reason: opened.reason, progress: [], retained: { configuration: false, trust: false } } as TrustedInstallActivationResult;
        return { kind: "rejected", code: opened.code, diagnostics: opened.diagnostics, progress: [], retained: { configuration: false, trust: false } } as TrustedInstallActivationResult;
      }
      const lookup = await registry.lookup(opened.session.token);
      if (lookup.kind !== "found") return { kind: lookup.kind } as TrustedInstallActivationResult;
      let submission = options.submission;
      if (submission === undefined && options.decisionProvider === undefined) return missingInput(lookup.entry);
      if (submission === undefined) {
        try {
          const decision = await options.decisionProvider!({ session: opened.session }, signal);
          if ("kind" in decision) return finish(lookup.entry, cancelled(lookup.entry, "input-validation"));
          submission = TrustedInstallSubmissionSchema.parse(decision);
        } catch (error) {
          if (signal.aborted) return finish(lookup.entry, cancelled(lookup.entry, "input-validation"));
          return finish(lookup.entry, { kind: "failed", code: "INTERACTION_FAILED", progress: lookup.entry.progress, retained: safeRetained(lookup.entry) });
        }
      }
      if (submission === undefined) throw new Error("trusted-install decision provider returned no submission");
      return activate({ token: opened.session.token, submission }, options, signal);
    },
    async status(request: Parameters<TrustedInstallationService["status"]>[0], signal: AbortSignal) {
      signal.throwIfAborted();
      const lookup = await registry.lookup(request.token);
      if (lookup.kind !== "found") return TrustedInstallStatusResultSchema.parse({ kind: lookup.kind });
      return TrustedInstallStatusResultSchema.parse({ kind: "found", session: view(lookup.entry), ...(lookup.entry.result === undefined ? {} : { result: lookup.entry.result }) });
    },
    async cancel(request: Parameters<TrustedInstallationService["cancel"]>[0], signal: AbortSignal) {
      signal.throwIfAborted();
      const lookup = await registry.lookup(request.token, false);
      if (lookup.kind !== "found") return TrustedInstallCancellationResultSchema.parse({ kind: lookup.kind });
      const entry = lookup.entry;
      entry.controller.abort(new DOMException("trusted-install cancelled", "AbortError"));
      if (entry.state !== "activating" && entry.result === undefined) await finish(entry, cancelled(entry, "input-validation"));
      return TrustedInstallCancellationResultSchema.parse({ kind: "accepted", state: entry.state });
    },
  });

  return Object.freeze({
    application,
    quiesce() { quiesced = true; registry.quiesce(); },
    close: () => registry.close(),
  });
}
