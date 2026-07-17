import { z } from "zod";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import { ProjectKeySchema, type ScopeReference } from "../domain/state/scope.js";
import {
  InspectionDetailIdSchema,
  InspectionSnapshotIdSchema,
  NativeInspectionDetailSchema,
  type NativeInspectionDetail,
  type NativeInspectionService,
  type NativeInspectionSummary,
} from "./native-inspection-contract.js";

export const NativeControlScopeSchema = z.enum(["user", "project", "all-current"]);
export type NativeControlScope = z.infer<typeof NativeControlScopeSchema>;

export const NativeControlPluginSelectorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("identity"), plugin: PluginKeySchema, scope: z.enum(["user", "project"]) }).strict().readonly(),
  z.object({ kind: z.literal("exact"), plugin: PluginKeySchema, scope: z.enum(["user", "project"]), snapshotId: InspectionSnapshotIdSchema, detailId: InspectionDetailIdSchema }).strict().readonly(),
]);
export type NativeControlPluginSelector = z.infer<typeof NativeControlPluginSelectorSchema>;
export const NativeControlCandidateSelectorSchema = NativeControlPluginSelectorSchema;
export type NativeControlCandidateSelector = NativeControlPluginSelector;

export const NativeControlUpdateSelectorSchema = z.object({
  plugin: PluginKeySchema,
  scope: z.enum(["user", "project"]),
  installed: z.object({ snapshotId: InspectionSnapshotIdSchema, detailId: InspectionDetailIdSchema }).strict().readonly().optional(),
  candidate: z.object({ snapshotId: InspectionSnapshotIdSchema, detailId: InspectionDetailIdSchema }).strict().readonly().optional(),
}).strict().readonly();
export type NativeControlUpdateSelector = z.infer<typeof NativeControlUpdateSelectorSchema>;

export type NativeControlSelectionFailure = Readonly<{
  kind: "not-found" | "ambiguous" | "stale" | "invalid" | "unavailable" | "wrong-subject";
}>;
export type NativeControlInstalledSelectionResult = Readonly<{ kind: "selected"; detail: NativeInspectionDetail }> | NativeControlSelectionFailure;
export type NativeControlCandidateSelectionResult = NativeControlInstalledSelectionResult;
export type NativeControlUpdateSelectionResult = Readonly<{ kind: "selected"; installed: NativeInspectionDetail; candidate: NativeInspectionDetail }> | NativeControlSelectionFailure;
export type NativeControlCurrentProjectResult = Readonly<{ kind: "found"; projectKey: z.infer<typeof ProjectKeySchema>; scope: Extract<ScopeReference, { kind: "project" }> }> | Readonly<{ kind: "unavailable" | "untrusted" | "stale" }>;

export interface NativeControlCurrentProjectPort {
  current(signal: AbortSignal): Promise<NativeControlCurrentProjectResult>;
}

export interface NativeControlSelectionService {
  installed(selector: NativeControlPluginSelector, signal: AbortSignal): Promise<NativeControlInstalledSelectionResult>;
  candidate(selector: NativeControlCandidateSelector, signal: AbortSignal): Promise<NativeControlCandidateSelectionResult>;
  update(selector: NativeControlUpdateSelector, signal: AbortSignal): Promise<NativeControlUpdateSelectionResult>;
  currentProject(signal: AbortSignal): Promise<NativeControlCurrentProjectResult>;
}

function scopeMatches(summary: NativeInspectionSummary, scope: "user" | "project"): boolean {
  return summary.scope.kind === scope;
}

function match(items: readonly NativeInspectionSummary[], plugin: PluginKey, scope: "user" | "project", subject: "installed" | "marketplace-candidate"): readonly NativeInspectionSummary[] {
  return items.filter((item) => item.subject === subject && item.plugin === plugin && scopeMatches(item, scope));
}

async function detail(
  inspection: NativeInspectionService,
  selector: NativeControlPluginSelector,
  subject: "installed" | "marketplace-candidate",
  signal: AbortSignal,
): Promise<NativeControlInstalledSelectionResult> {
  if (selector.kind === "exact") {
    const result = await inspection.detail({ snapshotId: selector.snapshotId, detailId: selector.detailId }, signal);
    if (result.kind === "stale") return { kind: "stale" };
    if (result.kind === "invalid-id") return { kind: "invalid" };
    if (result.kind === "missing") return { kind: "not-found" };
    if (result.kind === "unavailable") return { kind: "unavailable" };
    if (result.detail.summary.subject !== subject || result.detail.summary.plugin !== selector.plugin || !scopeMatches(result.detail.summary, selector.scope)) return { kind: "wrong-subject" };
    return { kind: "selected", detail: result.detail };
  }
  const page = await inspection.list({ subjects: [subject], scope: selector.scope, query: selector.plugin, limit: 100 }, signal);
  const matches = match(page.items, selector.plugin, selector.scope, subject);
  if (matches.length === 0) return { kind: "not-found" };
  if (matches.length > 1) return { kind: "ambiguous" };
  const selected = await inspection.detail({ snapshotId: page.snapshotId, detailId: matches[0]!.detailId }, signal);
  if (selected.kind === "stale") return { kind: "stale" };
  if (selected.kind === "invalid-id") return { kind: "invalid" };
  if (selected.kind === "missing") return { kind: "not-found" };
  if (selected.kind === "unavailable") return { kind: "unavailable" };
  if (selected.detail.summary.subject !== subject || selected.detail.summary.plugin !== selector.plugin || !scopeMatches(selected.detail.summary, selector.scope)) return { kind: "wrong-subject" };
  return { kind: "selected", detail: NativeInspectionDetailSchema.parse(selected.detail) };
}

export function createNativeControlSelectionService(dependencies: Readonly<{
  inspection: NativeInspectionService;
  currentProject: NativeControlCurrentProjectPort;
}>): NativeControlSelectionService {
  const service: NativeControlSelectionService = {
    installed: (selector: NativeControlPluginSelector, signal: AbortSignal) => detail(dependencies.inspection, NativeControlPluginSelectorSchema.parse(selector), "installed", signal),
    candidate: (selector: NativeControlCandidateSelector, signal: AbortSignal) => detail(dependencies.inspection, NativeControlCandidateSelectorSchema.parse(selector), "marketplace-candidate", signal),
    async update(selectorInput: NativeControlUpdateSelector, signal: AbortSignal): Promise<NativeControlUpdateSelectionResult> {
      const selector = NativeControlUpdateSelectorSchema.parse(selectorInput);
      const page = await dependencies.inspection.list({ subjects: ["installed", "marketplace-candidate"], scope: selector.scope, query: selector.plugin, limit: 100 }, signal);
      const installedMatches = match(page.items, selector.plugin, selector.scope, "installed");
      const candidateMatches = match(page.items, selector.plugin, selector.scope, "marketplace-candidate");
      const installedSummary = selector.installed === undefined ? installedMatches.length === 1 ? installedMatches[0] : undefined : page.items.find((item) => item.detailId === selector.installed!.detailId);
      const candidateSummary = selector.candidate === undefined ? candidateMatches.length === 1 ? candidateMatches[0] : undefined : page.items.find((item) => item.detailId === selector.candidate!.detailId);
      if (selector.installed === undefined && installedMatches.length > 1 || selector.candidate === undefined && candidateMatches.length > 1) return { kind: "ambiguous" };
      if (installedSummary === undefined || candidateSummary === undefined) return { kind: "not-found" };
      if (installedSummary.subject !== "installed" || candidateSummary.subject !== "marketplace-candidate") return { kind: "wrong-subject" };
      const snapshot = page.snapshotId;
      if (selector.installed !== undefined && selector.installed.snapshotId !== snapshot || selector.candidate !== undefined && selector.candidate.snapshotId !== snapshot) return { kind: "stale" };
      const [installedResult, candidateResult] = await Promise.all([
        dependencies.inspection.detail({ snapshotId: snapshot, detailId: installedSummary.detailId }, signal),
        dependencies.inspection.detail({ snapshotId: snapshot, detailId: candidateSummary.detailId }, signal),
      ]);
      if (installedResult.kind === "stale" || candidateResult.kind === "stale") return { kind: "stale" };
      if (installedResult.kind !== "found" || candidateResult.kind !== "found") return { kind: installedResult.kind === "unavailable" || candidateResult.kind === "unavailable" ? "unavailable" : "not-found" };
      if (installedResult.detail.summary.plugin !== selector.plugin || candidateResult.detail.summary.plugin !== selector.plugin || !scopeMatches(installedResult.detail.summary, selector.scope) || !scopeMatches(candidateResult.detail.summary, selector.scope)) return { kind: "wrong-subject" };
      return { kind: "selected", installed: installedResult.detail, candidate: candidateResult.detail };
    },
    currentProject: dependencies.currentProject.current.bind(dependencies.currentProject),
  };
  return Object.freeze(service);
}
