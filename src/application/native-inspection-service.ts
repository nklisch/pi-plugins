import { compareUtf8 } from "../domain/canonical-json.js";
import { parsePluginKey } from "../domain/identity.js";
import { toScopeReference } from "../domain/state/scope.js";
import { normalizeMarketplaceQuery } from "./marketplace-search.js";
import type { MarketplaceCatalogService } from "./marketplace-catalog-service.js";
import type { AdoptionService } from "./adoption-service.js";
import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { InspectionEvidenceSnapshot, NativeInspectionEvidencePort } from "./ports/native-inspection-evidence.js";
import type { Sha256 } from "../domain/source.js";
import type { NativeInstalledInspector } from "./native-installed-inspection.js";
import {
  NativeDiagnosticReportSchema,
  NativeDiagnosisRequestSchema,
  NativeInspectionDetailRequestSchema,
  NativeInspectionDetailResultSchema,
  NativeInspectionListRequestSchema,
  NativeInspectionPageSchema,
  NativeInspectionSummarySchema,
  NativeScopeObservationSchema,
  type NativeDiagnostic,
  type NativeDiagnosticReport,
  type NativeDiagnosisRequest,
  type NativeInspectionCondition,
  type NativeInspectionDetailRequest,
  type NativeInspectionDetailResult,
  type NativeInspectionListRequest,
  type NativeInspectionPage,
  type NativeInspectionService,
  type NativeInspectionSummary,
} from "./native-inspection-contract.js";
import {
  countNativeDiagnostics,
  compileNativeDiagnostics,
  deriveNativeInspectionCondition,
  unavailableEvidenceFinding,
  type NativeDiagnosticInput,
} from "./native-diagnostic-compiler.js";
import { NativeDisplayLimits, toSafeDisplayField } from "./native-inspection-display.js";
import {
  decodeInspectionCursor,
  decodeInspectionDetailId,
  deriveInspectionDetailId,
  deriveInspectionEvidenceSnapshotId,
  deriveInspectionFilterHash,
  encodeInspectionCursor,
  type InspectionDetailSubject,
} from "./native-inspection-identifiers.js";

export class NativeInspectionError extends Error {
  constructor(readonly code: "CURSOR_INVALID" | "CURSOR_STALE" | "SNAPSHOT_STALE") {
    super(code === "CURSOR_INVALID" ? "inspection cursor is invalid" : "inspection snapshot is stale");
    this.name = "NativeInspectionError";
  }
  toJSON() { return Object.freeze({ code: this.code }); }
}

export type NativeCandidateInspector = Readonly<{
  inspect(subject: Extract<InspectionDetailSubject, { subject: "marketplace-candidate" }>, snapshot: InspectionEvidenceSnapshot, signal: AbortSignal): Promise<NativeInspectionDetailResult>;
}>;

function safe(value: string) {
  return toSafeDisplayField(value, { maxScalars: NativeDisplayLimits.labelScalars });
}

function scopeMatches(selection: NativeInspectionListRequest["scope"], scope: NativeInspectionSummary["scope"]): boolean {
  return selection === "all-current" || selection === scope.kind;
}

function summarySort(value: NativeInspectionSummary): readonly string[] {
  const names = parsePluginKey(value.plugin);
  return [
    value.subject === "installed" ? "0" : "1",
    value.scope.kind === "user" ? "0" : `1:${value.scope.projectKey}`,
    names.marketplace,
    names.plugin,
    value.revision.installed?.text ?? value.revision.available?.text ?? "",
    value.detailId,
  ];
}

function compareTuple(left: readonly string[], right: readonly string[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const result = compareUtf8(left[index] ?? "", right[index] ?? "");
    if (result !== 0) return result;
  }
  return 0;
}

function queryMatches(summary: NativeInspectionSummary, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true;
  const searchable = [summary.plugin, summary.name.text, summary.marketplace.text, summary.revision.installed?.text ?? "", summary.revision.available?.text ?? ""]
    .join("\n").normalize("NFKC").toLocaleLowerCase("en-US");
  return tokens.every((token) => searchable.includes(token));
}

function pageCondition(items: readonly NativeInspectionSummary[], observations: readonly { status: "ready" | "corrupt" | "unavailable" }[]): NativeInspectionCondition {
  if (observations.some((observation) => observation.status === "corrupt") || items.some((item) => item.condition === "blocked")) return "blocked";
  if (items.length > 0 && items.every((item) => item.condition === "unavailable")) return "unavailable";
  if (observations.some((observation) => observation.status === "unavailable") || items.some((item) => item.condition !== "ready")) return "degraded";
  return "ready";
}

function basicCandidateSummary(
  candidate: Awaited<ReturnType<MarketplaceCatalogService["search"]>>["candidates"][number],
  snapshot: InspectionEvidenceSnapshot,
  sha256: Sha256,
): NativeInspectionSummary {
  const subject = {
    version: 1 as const,
    subject: "marketplace-candidate" as const,
    scope: candidate.scope,
    plugin: candidate.plugin,
    registrationId: candidate.registrationId,
    candidateId: candidate.id,
    catalogSnapshot: candidate.snapshot,
  };
  const detailId = deriveInspectionDetailId(subject, sha256);
  const observation = snapshot.binding.catalogs.find((entry) => entry.registrationId === candidate.registrationId);
  const findings: NativeDiagnosticInput["findings"][number][] = [];
  if (observation?.cache.kind === "stale") findings.push({ key: "catalogStale", subjectId: detailId });
  else if (observation === undefined || ["unavailable", "corrupt", "not-materialized"].includes(observation.cache.kind)) findings.push({ key: "catalogUnavailable", subjectId: detailId });
  const diagnostics = compileNativeDiagnostics({ findings }, sha256);
  const available = candidate.available.kind === "marketplace-snapshot"
    ? candidate.available.declaredVersion ?? candidate.available.marketplaceRevision
    : candidate.available.declaredVersion ?? candidate.available.selector;
  return NativeInspectionSummarySchema.parse({
    detailId,
    subject: "marketplace-candidate",
    scope: candidate.scope,
    plugin: candidate.plugin,
    name: safe(candidate.name),
    marketplace: safe(candidate.marketplace),
    revision: { ...(available === undefined ? {} : { available: safe(available) }), resolution: candidate.available.kind === "marketplace-snapshot" ? "exact" : candidate.available.selector === undefined ? "unresolved" : "declared-selector" },
    condition: deriveNativeInspectionCondition(diagnostics),
    freshness: { status: observation?.cache.kind === "stale" ? "stale" : observation?.cache.kind === "unknown-local" ? "unknown" : observation === undefined ? "unavailable" : "current", basis: "marketplace" },
    diagnosticCounts: countNativeDiagnostics(diagnostics),
  });
}

function fallbackInstalledSummary(subject: Extract<InspectionDetailSubject, { subject: "installed" }>, diagnostics: readonly NativeDiagnostic[]): NativeInspectionSummary {
  const names = parsePluginKey(subject.plugin);
  return NativeInspectionSummarySchema.parse({
    detailId: diagnostics[0]?.subjectId ?? (() => { throw new Error("installed diagnostic subject is unavailable"); })(),
    subject: "installed",
    scope: subject.scope,
    plugin: subject.plugin,
    name: safe(names.plugin),
    marketplace: safe(names.marketplace),
    revision: { installed: safe(subject.selectedRevision), immutable: subject.selectedRevision, resolution: "exact" },
    condition: deriveNativeInspectionCondition(diagnostics),
    freshness: { status: "unavailable", basis: "state" },
    diagnosticCounts: countNativeDiagnostics(diagnostics),
  });
}

export function createNativeInspectionService(dependencies: Readonly<{
  evidence: NativeInspectionEvidencePort;
  installed: NativeInstalledInspector;
  candidates: NativeCandidateInspector;
  catalog: Pick<MarketplaceCatalogService, "search" | "detail">;
  adoption: Pick<AdoptionService, "preview">;
  clock: LifecycleClock;
  sha256: Sha256;
}>): NativeInspectionService {
  if (dependencies === null || typeof dependencies !== "object" || typeof dependencies.sha256 !== "function") {
    throw new TypeError("native inspection service dependencies are required");
  }

  async function routeDetail(subject: InspectionDetailSubject, snapshot: InspectionEvidenceSnapshot, signal: AbortSignal) {
    return subject.subject === "installed"
      ? dependencies.installed.inspect(subject, snapshot, signal)
      : dependencies.candidates.inspect(subject, snapshot, signal);
  }

  async function captureFor(snapshotId: string | undefined, signal: AbortSignal) {
    const snapshot = await dependencies.evidence.capture(signal);
    const currentId = deriveInspectionEvidenceSnapshotId(snapshot.binding, dependencies.sha256);
    return { snapshot, currentId, stale: snapshotId !== undefined && currentId !== snapshotId };
  }

  const service: NativeInspectionService = {
    async list(requestInput, signal): Promise<NativeInspectionPage> {
      signal.throwIfAborted();
      const request = NativeInspectionListRequestSchema.parse(requestInput);
      const { snapshot, currentId: snapshotId } = await captureFor(undefined, signal);
      const tokens = normalizeMarketplaceQuery(request.query);
      const filterHash = deriveInspectionFilterHash({
        subjects: [...request.subjects].sort(compareUtf8),
        scope: request.scope,
        query: tokens,
        conditions: request.conditions === undefined ? null : [...request.conditions].sort(compareUtf8),
      }, dependencies.sha256);

      const summaries: NativeInspectionSummary[] = [];
      if (request.subjects.includes("installed")) {
        for (const state of snapshot.states) {
          if (!state.ok) continue;
          const scope = toScopeReference(state.snapshot.scope);
          if (!scopeMatches(request.scope, scope)) continue;
          const records = "installed" in state.snapshot ? state.snapshot.installed.plugins : state.snapshot.project.plugins;
          for (const record of records) {
            const subject = { version: 1 as const, subject: "installed" as const, scope, plugin: record.plugin, selectedRevision: record.selectedRevision };
            const result = await dependencies.installed.inspect(subject, snapshot, signal);
            if (result.kind === "stale") throw new NativeInspectionError("SNAPSHOT_STALE");
            if (result.kind === "found") summaries.push(result.detail.summary);
            else if (result.kind === "unavailable") {
              const diagnostics = result.diagnostics;
              summaries.push(result.summary ?? fallbackInstalledSummary(subject, diagnostics));
            }
          }
        }
      }

      if (request.subjects.includes("marketplace-candidate")) {
        let cursor: Awaited<ReturnType<MarketplaceCatalogService["search"]>>["nextCursor"];
        do {
          const page = await dependencies.catalog.search({ scope: request.scope, query: request.query, limit: 100, ...(cursor === undefined ? {} : { cursor }) }, signal);
          summaries.push(...page.candidates.map((candidate) => basicCandidateSummary(candidate, snapshot, dependencies.sha256)));
          cursor = page.nextCursor;
        } while (cursor !== undefined);
      }

      const filtered = summaries
        .filter((summary) => queryMatches(summary, tokens))
        .filter((summary) => request.conditions === undefined || request.conditions.includes(summary.condition))
        .sort((left, right) => compareTuple(summarySort(left), summarySort(right)));
      let start = 0;
      if (request.cursor !== undefined) {
        const decoded = decodeInspectionCursor(request.cursor, { snapshotId, filterHash }, dependencies.sha256);
        if (decoded.kind === "invalid") throw new NativeInspectionError("CURSOR_INVALID");
        if (decoded.kind === "stale") throw new NativeInspectionError("CURSOR_STALE");
        const index = filtered.findIndex((summary) => compareTuple(summarySort(summary), decoded.payload.lastSort) === 0);
        if (index < 0) throw new NativeInspectionError("CURSOR_STALE");
        start = index + 1;
      }
      const items = filtered.slice(start, start + request.limit);
      const nextCursor = start + items.length < filtered.length && items.length > 0
        ? encodeInspectionCursor({ version: 1, snapshotId, filterHash, lastSort: summarySort(items.at(-1)!) }, dependencies.sha256)
        : undefined;
      const observations = snapshot.binding.scopes.map((observation) => NativeScopeObservationSchema.parse({
        scope: observation.scope,
        status: observation.status,
        ...(observation.generation === undefined ? {} : { generation: observation.generation }),
        corruptionCodes: observation.corruptionCodes.map((code) => safe(code)),
      }));
      if (await dependencies.evidence.validate(snapshot.binding, signal) === "stale") throw new NativeInspectionError("SNAPSHOT_STALE");
      return NativeInspectionPageSchema.parse({
        snapshotId,
        condition: pageCondition(items, observations),
        items,
        observations,
        ...(nextCursor === undefined ? {} : { nextCursor }),
      });
    },

    async detail(requestInput, signal): Promise<NativeInspectionDetailResult> {
      signal.throwIfAborted();
      const request = NativeInspectionDetailRequestSchema.parse(requestInput);
      const subject = decodeInspectionDetailId(request.detailId, dependencies.sha256);
      if (subject === undefined) return NativeInspectionDetailResultSchema.parse({ kind: "invalid-id" });
      const { snapshot, stale } = await captureFor(request.snapshotId, signal);
      if (stale) return NativeInspectionDetailResultSchema.parse({ kind: "stale", action: "retry-read" });
      return routeDetail(subject, snapshot, signal);
    },

    async diagnose(requestInput, signal): Promise<NativeDiagnosticReport> {
      signal.throwIfAborted();
      const request = NativeDiagnosisRequestSchema.parse(requestInput);
      const { snapshot, currentId: snapshotId, stale } = await captureFor(request.target.kind === "detail" ? request.target.snapshotId : undefined, signal);
      if (stale) throw new NativeInspectionError("SNAPSHOT_STALE");
      const observations = snapshot.binding.scopes.map((observation) => NativeScopeObservationSchema.parse({
        scope: observation.scope,
        status: observation.status,
        ...(observation.generation === undefined ? {} : { generation: observation.generation }),
        corruptionCodes: observation.corruptionCodes.map((code) => safe(code)),
      }));
      if (request.target.kind === "detail") {
        const subject = decodeInspectionDetailId(request.target.detailId, dependencies.sha256);
        if (subject === undefined) throw new NativeInspectionError("CURSOR_INVALID");
        const result = await routeDetail(subject, snapshot, signal);
        if (result.kind === "stale") throw new NativeInspectionError("SNAPSHOT_STALE");
        const diagnostics = result.kind === "found" ? result.detail.diagnostics
          : result.kind === "unavailable" ? result.diagnostics
          : compileNativeDiagnostics({ findings: [{ key: "candidateMissing" }] }, dependencies.sha256);
        return NativeDiagnosticReportSchema.parse({ snapshotId, condition: deriveNativeInspectionCondition(diagnostics), observations, diagnostics });
      }

      const findings: NativeDiagnosticInput["findings"][number][] = [];
      for (const scope of snapshot.binding.scopes) {
        if (scope.status === "corrupt") findings.push({ key: "stateCorrupt" });
        else if (scope.status === "unavailable") findings.push(unavailableEvidenceFinding("state"));
      }
      for (const result of snapshot.recovery.results) {
        if (result.kind === "blocked") findings.push({ key: "recoveryBlocked" });
        else if (result.kind === "deferred") findings.push({ key: "recoveryDeferred" });
      }
      if (snapshot.binding.capability.status === "unavailable") findings.push({ key: "capabilityUnavailable" });
      for (const catalog of snapshot.binding.catalogs) {
        if (catalog.cache.kind === "stale") findings.push({ key: "catalogStale" });
        else if (["unavailable", "corrupt", "not-materialized"].includes(catalog.cache.kind)) findings.push({ key: "catalogUnavailable" });
      }
      if (request.includeAdoption) {
        try {
          const adoption = await dependencies.adoption.preview({ compareScope: "all-current" }, signal);
          for (const document of adoption.documents) {
            if (document.kind === "unreadable") findings.push({ key: "adoptionUnreadable" });
            else if (document.kind === "changed-during-read") findings.push({ key: "adoptionChanged" });
          }
        } catch (error) {
          if (signal.aborted) throw signal.reason ?? error;
          findings.push(unavailableEvidenceFinding("adoption"));
        }
      }
      const diagnostics = compileNativeDiagnostics({ findings }, dependencies.sha256);
      if (await dependencies.evidence.validate(snapshot.binding, signal) === "stale") throw new NativeInspectionError("SNAPSHOT_STALE");
      return NativeDiagnosticReportSchema.parse({ snapshotId, condition: deriveNativeInspectionCondition(diagnostics), observations, diagnostics });
    },
  };
  void dependencies.clock;
  return Object.freeze(service);
}
