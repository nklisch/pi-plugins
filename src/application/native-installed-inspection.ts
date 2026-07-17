import { evaluateCompatibility } from "../domain/compatibility-evaluator.js";
import { CompatibilityReportSchema } from "../domain/compatibility.js";
import { compareUtf8 } from "../domain/canonical-json.js";
import type { ComponentId } from "../domain/components.js";
import { parsePluginKey } from "../domain/identity.js";
import type { InstalledPluginRecord, InstalledRevisionRecord } from "../domain/state/installed-state.js";
import { toScopeReference, type ScopeContext, type ScopeReference } from "../domain/state/scope.js";
import { createTrustCandidate } from "../domain/trust-policy.js";
import type { InstalledPluginLoader } from "./ports/installed-plugin-loader.js";
import type { InspectionReadinessPort } from "./ports/inspection-readiness.js";
import type { InspectionEvidenceSnapshot, InstalledRuntimeEvidence, NativeInspectionEvidencePort } from "./ports/native-inspection-evidence.js";
import { digestCompatibilityReport } from "./ports/runtime-projection.js";
import { marketplaceUpdateRecords } from "./marketplace-update-state.js";
import type { Sha256 } from "../domain/source.js";
import {
  NativeActivationViewSchema,
  NativeCompatibilityViewSchema,
  NativeInspectionDetailResultSchema,
  NativeInspectionDetailSchema,
  NativeInspectionSummarySchema,
  NativeMcpHealthViewSchema,
  type NativeInspectionDetailResult,
  type NativeTrustReadiness,
} from "./native-inspection-contract.js";
import {
  countNativeDiagnostics,
  compileNativeDiagnostics,
  deriveNativeInspectionCondition,
  unavailableEvidenceFinding,
  type NativeDiagnosticInput,
} from "./native-diagnostic-compiler.js";
import { projectSafeComponents, projectSafeProvenance, projectSafeSource } from "./native-inspection-disclosure.js";
import { NativeDisplayLimits, toSafeDisplayField } from "./native-inspection-display.js";
import {
  deriveInspectionDetailId,
  deriveInspectionEvidenceSnapshotId,
  type InstalledInspectionDetailSubject,
} from "./native-inspection-identifiers.js";

export type NativeInstalledInspector = Readonly<{
  inspect(subject: InstalledInspectionDetailSubject, snapshot: InspectionEvidenceSnapshot, signal: AbortSignal): Promise<NativeInspectionDetailResult>;
}>;

function safe(value: string, maxScalars: number = NativeDisplayLimits.labelScalars) {
  return toSafeDisplayField(value, { maxScalars });
}

function sameScope(left: ScopeReference, right: ScopeReference): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stateRecord(subject: InstalledInspectionDetailSubject, snapshot: InspectionEvidenceSnapshot): Readonly<{
  scope: ScopeContext;
  record: InstalledPluginRecord;
  revision?: InstalledRevisionRecord;
}> | "corrupt" | undefined {
  const result = snapshot.states.find((candidate) => sameScope(toScopeReference(candidate.ok ? candidate.snapshot.scope : candidate.scope), subject.scope));
  if (result === undefined) return undefined;
  if (!result.ok) return "corrupt";
  const records = "installed" in result.snapshot ? result.snapshot.installed.plugins : result.snapshot.project.plugins;
  const record = records.find((candidate) => candidate.plugin === subject.plugin);
  if (record === undefined || record.selectedRevision !== subject.selectedRevision) return undefined;
  const revision = record.revisions.find((candidate) => candidate.revision === record.selectedRevision);
  return { scope: result.snapshot.scope, record, ...(revision === undefined ? {} : { revision }) };
}

function finding(key: NativeDiagnosticInput["findings"][number]["key"], subjectId: import("./native-inspection-contract.js").InspectionDetailId, componentId?: ComponentId): NativeDiagnosticInput["findings"][number] {
  return { key, subjectId, ...(componentId === undefined ? {} : { componentId }) };
}

function sorted(values: readonly ComponentId[]): readonly ComponentId[] {
  return [...values].sort(compareUtf8);
}

function sameIds(left: readonly ComponentId[], right: readonly ComponentId[]): boolean {
  const a = sorted(left);
  const b = sorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function recoveryTransition(subject: InstalledInspectionDetailSubject, snapshot: InspectionEvidenceSnapshot): "none" | "deferred" | "blocked" | "recovery-required" {
  const matches = snapshot.recovery.results.filter((result) =>
    sameScope(result.scope, subject.scope) && result.plugin === subject.plugin);
  if (matches.some((result) => result.kind === "blocked")) return "blocked";
  if (matches.some((result) => result.kind === "deferred")) return "deferred";
  return snapshot.startup.blocked.some((entry) => entry.plugin === subject.plugin) ? "recovery-required" : "none";
}

function updateState(subject: InstalledInspectionDetailSubject, snapshot: InspectionEvidenceSnapshot) {
  const loaded = snapshot.states.find((result) => result.ok && sameScope(toScopeReference(result.snapshot.scope), subject.scope));
  if (loaded === undefined || !loaded.ok) return { state: "unknown" as const, stale: false };
  for (const registration of marketplaceUpdateRecords(loaded.snapshot)) {
    const notification = registration.notifications.find((entry) => sameScope(entry.scope, subject.scope) && entry.plugin === subject.plugin);
    if (notification !== undefined) {
      return {
        state: notification.disposition === undefined ? "available" as const : notification.disposition,
        stale: registration.refresh.lastAttempt?.outcome === "failed" || registration.refresh.lastAttempt?.outcome === "unavailable",
      };
    }
    if (subject.plugin.endsWith(`@${registration.marketplace}`)) {
      const stale = registration.refresh.lastAttempt?.outcome === "failed" || registration.refresh.lastAttempt?.outcome === "unavailable";
      return { state: stale ? "failed" as const : "current" as const, stale };
    }
  }
  return { state: "unknown" as const, stale: false };
}

function participantStatus(input: Readonly<{
  evidence: InstalledRuntimeEvidence | undefined;
  participant: "skills-hooks" | "mcp";
  expectedSkills?: readonly ComponentId[];
  expectedHooks?: readonly ComponentId[];
  selectedRevision: string;
}>): "matching" | "missing" | "mismatched" | "unavailable" {
  if (input.evidence === undefined) return "missing";
  if (input.participant === "skills-hooks") {
    const result = input.evidence.skillsHooks;
    if (result.kind !== "ready") return "unavailable";
    const observation = result.observation;
    if (observation.kind === "inactive") return input.expectedSkills?.length === 0 && input.expectedHooks?.length === 0 ? "matching" : "missing";
    return observation.revision === input.selectedRevision && observation.projectionDigest === input.evidence.projectionDigest &&
      sameIds(observation.skillComponentIds, input.expectedSkills ?? []) && sameIds(observation.hookComponentIds, input.expectedHooks ?? [])
      ? "matching" : "mismatched";
  }
  const expected = input.evidence.mcp.expected;
  const status = input.evidence.mcp.status;
  if (status.kind !== "ready") return "unavailable";
  if (expected.kind !== "source") return status.status === null ? "matching" : "mismatched";
  if (status.status === null) return "missing";
  if (status.status.registrationDigest !== expected.registrationDigest || status.status.state !== "registered") return "mismatched";
  return sameIds(status.status.servers.map((server) => server.componentId), expected.servers.map((server) => server.componentId)) ? "matching" : "mismatched";
}

/** Installed detail over one exact state/runtime evidence snapshot. */
export function createNativeInstalledInspector(dependencies: Readonly<{
  installed: InstalledPluginLoader;
  readiness: InspectionReadinessPort;
  evidence: NativeInspectionEvidencePort;
  sha256: Sha256;
}>): NativeInstalledInspector {
  if (dependencies === null || typeof dependencies !== "object" || typeof dependencies.sha256 !== "function") {
    throw new TypeError("installed inspection dependencies are required");
  }

  return Object.freeze({
    async inspect(subject, snapshot, signal) {
      signal.throwIfAborted();
      const detailId = deriveInspectionDetailId(subject, dependencies.sha256);
      const snapshotId = deriveInspectionEvidenceSnapshotId(snapshot.binding, dependencies.sha256);
      const authority = stateRecord(subject, snapshot);
      if (authority === undefined) return NativeInspectionDetailResultSchema.parse({ kind: "missing" });
      if (authority === "corrupt") {
        const diagnostics = compileNativeDiagnostics({ findings: [finding("stateCorrupt", detailId)] }, dependencies.sha256);
        return NativeInspectionDetailResultSchema.parse({ kind: "unavailable", diagnostics });
      }
      if (authority.revision === undefined) {
        const diagnostics = compileNativeDiagnostics({ findings: [finding("revisionUnavailable", detailId)] }, dependencies.sha256);
        return NativeInspectionDetailResultSchema.parse({ kind: "unavailable", diagnostics });
      }

      let loaded: Awaited<ReturnType<InstalledPluginLoader["load"]>>;
      try {
        loaded = await dependencies.installed.load({ scope: authority.scope, revision: authority.revision }, signal);
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? error;
        const diagnostics = compileNativeDiagnostics({ findings: [finding("revisionUnavailable", detailId)] }, dependencies.sha256);
        const names = parsePluginKey(subject.plugin);
        const summary = NativeInspectionSummarySchema.parse({
          detailId, subject: "installed", scope: subject.scope, plugin: subject.plugin,
          name: safe(names.plugin), marketplace: safe(names.marketplace),
          revision: { installed: safe(subject.selectedRevision), immutable: subject.selectedRevision, resolution: "exact" },
          condition: "unavailable", freshness: { status: "unavailable", basis: "state" },
          diagnosticCounts: countNativeDiagnostics(diagnostics),
        });
        return NativeInspectionDetailResultSchema.parse({ kind: "unavailable", summary, diagnostics });
      }
      if (loaded.plugin.identity.key !== subject.plugin || loaded.binding !== subject.selectedRevision) {
        const diagnostics = compileNativeDiagnostics({ findings: [finding("revisionUnavailable", detailId)] }, dependencies.sha256);
        return NativeInspectionDetailResultSchema.parse({ kind: "unavailable", diagnostics });
      }

      const report = snapshot.capabilities === undefined
        ? undefined
        : CompatibilityReportSchema.parse(evaluateCompatibility({ plugin: loaded.plugin, capabilities: snapshot.capabilities }));
      const configuration = await dependencies.readiness.configuration({
        plugin: subject.plugin,
        scope: subject.scope,
        descriptors: loaded.plugin.configuration,
        ...(authority.revision.configurationRef === undefined ? {} : { configurationRef: authority.revision.configurationRef }),
      }, signal);
      let trust: NativeTrustReadiness = "not-applicable";
      if (subject.scope.kind === "project" && snapshot.currentProject.trust.kind !== "trusted") {
        trust = "project-untrusted";
      } else if (report?.activatable === true) {
        trust = await dependencies.readiness.trust(createTrustCandidate({
          scope: subject.scope,
          marketplaceSource: loaded.marketplaceSource,
          plugin: loaded.plugin,
          compatibility: report,
          content: loaded.content,
          materializationBinding: loaded.binding,
        }, dependencies.sha256), subject.scope, signal);
      }

      const runtime = snapshot.runtime.find((candidate) => sameScope(candidate.scope, subject.scope) && candidate.plugin === subject.plugin && candidate.selectedRevision === subject.selectedRevision);
      const assessments = new Map(report?.components.map((assessment) => [assessment.componentId, assessment]) ?? []);
      const expectedSkills = loaded.plugin.components.skills.filter((component) => assessments.get(component.id)?.verdict.kind === "supported").map((component) => component.id);
      const expectedHooks = loaded.plugin.components.hooks.filter((component) => assessments.get(component.id)?.verdict.kind === "supported").map((component) => component.id);
      const skillsStatus = participantStatus({ evidence: runtime, participant: "skills-hooks", expectedSkills, expectedHooks, selectedRevision: subject.selectedRevision });
      const mcpStatus = participantStatus({ evidence: runtime, participant: "mcp", selectedRevision: subject.selectedRevision });
      const transition = authority.record.pendingTransition !== undefined ? "pending" as const : recoveryTransition(subject, snapshot);
      const update = updateState(subject, snapshot);
      const findings: NativeDiagnosticInput["findings"][number][] = [];
      if (transition === "pending") findings.push(finding("transitionPending", detailId));
      else if (transition === "deferred") findings.push(finding("recoveryDeferred", detailId));
      else if (transition === "blocked" || transition === "recovery-required") findings.push(finding("recoveryRequired", detailId));
      if (trust === "project-untrusted") findings.push(finding("projectUntrusted", detailId));
      if (report === undefined) findings.push(finding("capabilityUnavailable", detailId));
      else {
        if (!report.activatable) findings.push(finding("incompatible", detailId));
        for (const assessment of report.requirements.filter((item) => item.status === "unavailable")) {
          for (const component of report.components.filter((item) => item.requirementIds.includes(assessment.requirement.id))) {
            findings.push(finding("requirementUnavailable", detailId, component.componentId));
          }
        }
      }
      if (trust === "required") findings.push(finding("trustRequired", detailId));
      else if (trust === "revoked") findings.push(finding("trustRevoked", detailId));
      else if (trust === "invalid-evidence") findings.push(finding("trustInvalid", detailId));
      else if (trust === "unavailable") findings.push(unavailableEvidenceFinding("trust", detailId));
      for (const option of configuration) {
        if (option.required && option.state === "missing") findings.push(finding("configurationRequired", detailId));
        if (option.state === "invalid") findings.push(finding("configurationInvalid", detailId));
        if (option.required && option.sensitive && option.state === "unavailable") findings.push(finding("secretCustodyUnavailable", detailId));
      }

      const participantsRequired = authority.record.activation === "enabled" && report?.activatable === true && trust === "authorized" && transition === "none";
      if (participantsRequired && (skillsStatus !== "matching" || mcpStatus !== "matching")) {
        findings.push(finding(mcpStatus === "mismatched" || mcpStatus === "missing" ? "mcpRegistrationMismatch" : "activationMismatch", detailId));
      }
      if (authority.record.activation === "disabled" && (skillsStatus !== "matching" || mcpStatus !== "matching")) {
        findings.push(finding("activationMismatch", detailId));
      }
      const localMcpMatching = mcpStatus === "matching" && runtime?.mcp.status.kind === "ready";
      if (localMcpMatching) {
        for (const server of runtime.mcp.status.kind === "ready" ? runtime.mcp.status.status?.servers ?? [] : []) {
          if (server.state === "needs-auth") findings.push(finding("mcpAuthRequired", detailId, server.componentId));
          else if (server.state === "failed") findings.push(finding("mcpRemoteFailed", detailId, server.componentId));
        }
      }
      if (update.state === "available") findings.push(finding("updateAvailable", detailId));
      else if (update.state === "approval-required") findings.push(finding("updateApprovalRequired", detailId));
      else if (update.state === "manual-required") findings.push(finding("updateManualRequired", detailId));
      else if (update.state === "recovery-required") findings.push(finding("updateRecoveryRequired", detailId));
      else if (update.state === "failed" || update.stale) findings.push(finding("updateFailed", detailId));

      const diagnostics = compileNativeDiagnostics({ findings }, dependencies.sha256);
      const condition = deriveNativeInspectionCondition(diagnostics);
      const names = parsePluginKey(subject.plugin);
      const displayRevision = authority.revision.evidence.source.declaredVersion ?? authority.revision.evidence.source.sourceRevision ?? subject.selectedRevision;
      const summary = NativeInspectionSummarySchema.parse({
        detailId,
        subject: "installed",
        scope: subject.scope,
        plugin: subject.plugin,
        name: safe(loaded.plugin.identity.manifestName ?? names.plugin),
        marketplace: safe(names.marketplace),
        revision: { installed: safe(displayRevision), immutable: subject.selectedRevision, resolution: "exact" },
        condition,
        freshness: { status: update.stale ? "stale" : "current", basis: update.stale ? "update" : "state" },
        diagnosticCounts: countNativeDiagnostics(diagnostics),
      });
      const compatibility = NativeCompatibilityViewSchema.parse({
        status: report === undefined ? "unavailable" : report.activatable ? "activatable" : "incompatible",
        reportFingerprint: report === undefined ? authority.revision.evidence.compatibility.fingerprint : digestCompatibilityReport(report, dependencies.sha256),
        components: projectSafeComponents({ plugin: loaded.plugin, ...(report === undefined ? {} : { compatibility: report }) }),
        requirements: (report?.requirements ?? []).map((assessment) => ({
          id: assessment.requirement.id,
          capability: safe(assessment.requirement.capability),
          status: assessment.status,
          explanation: safe(assessment.explanation, NativeDisplayLimits.descriptionScalars),
          provenance: projectSafeProvenance(assessment.requirement.provenance),
        })).sort((left, right) => compareUtf8(left.id, right.id)),
      });
      const activationState = transition !== "none" ? (transition === "pending" ? "pending" : "recovery-required")
        : condition === "blocked" ? "blocked"
        : runtime === undefined ? "unavailable"
        : authority.record.activation === "disabled" ? "inactive"
        : skillsStatus === "matching" && mcpStatus === "matching" ? "active"
        : "blocked";
      const activation = NativeActivationViewSchema.parse({
        intent: authority.record.activation,
        state: activationState,
        selectedRevision: subject.selectedRevision,
        ...(runtime?.projectionDigest === undefined ? {} : { projectionDigest: runtime.projectionDigest }),
        participants: [
          { participant: "skills-hooks", status: skillsStatus, ...(runtime?.skillsHooks.kind === "ready" ? { contributionDigest: runtime.skillsHooks.observation.contributionDigest } : {}) },
          { participant: "mcp", status: mcpStatus, ...(runtime?.mcp.expected.registrationDigest === undefined ? {} : { contributionDigest: runtime.mcp.expected.registrationDigest }) },
        ],
      });
      const mcpHealth = runtime === undefined ? undefined : NativeMcpHealthViewSchema.parse({
        localRegistration: mcpStatus === "matching" ? "matching" : mcpStatus === "missing" ? "absent" : mcpStatus,
        servers: runtime.mcp.status.kind !== "ready" || runtime.mcp.status.status === null ? [] : runtime.mcp.status.status.servers.map((server) => ({
          componentId: server.componentId,
          serverKey: server.key,
          nativeKey: safe(server.nativeKey),
          transport: runtime.mcp.expected.servers.find((candidate) => candidate.componentId === server.componentId)?.transport ?? "stdio",
          state: server.state,
          ...(server.toolCount === undefined ? {} : { toolCount: server.toolCount }),
          ...(server.errorCode === undefined ? {} : { errorCode: server.errorCode }),
        })),
      });
      if (await dependencies.evidence.validate(snapshot.binding, signal) === "stale") {
        return NativeInspectionDetailResultSchema.parse({ kind: "stale", action: "retry-read" });
      }
      return NativeInspectionDetailResultSchema.parse({
        kind: "found",
        detail: NativeInspectionDetailSchema.parse({
          snapshotId,
          summary,
          source: projectSafeSource(loaded.plugin.source),
          provenance: [],
          compatibility,
          trust,
          configuration,
          lifecycle: { installed: true, activationIntent: authority.record.activation, transition, update: update.state },
          activation,
          ...(mcpHealth === undefined ? {} : { mcpHealth }),
          diagnostics,
        }),
      });
    },
  });
}
