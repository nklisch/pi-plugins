import { deriveMarketplaceSourceIdentity, derivePluginSourceIdentity, type UpdateNotice } from "../domain/update-policy.js";
import { MarketplaceCandidateIdSchema, MarketplaceRegistrationIdSchema, MarketplaceSnapshotTokenSchema } from "../domain/marketplace-registration.js";
import { toScopeReference, type ScopeContext } from "../domain/state/scope.js";
import type { Sha256 } from "../domain/source.js";
import type { MarketplaceCatalogService } from "../application/marketplace-catalog-service.js";
import { deriveInspectionDetailId, deriveInspectionEvidenceSnapshotId } from "../application/native-inspection-identifiers.js";
import { deriveLifecycleTargetDigest } from "../application/native-lifecycle-target.js";
import { LifecycleTargetExpectationSchema } from "../application/native-lifecycle-operation-contract.js";
import type { NativeInspectionService } from "../application/native-inspection-contract.js";
import type { NativeInspectionEvidencePort } from "../application/ports/native-inspection-evidence.js";
import type { LifecycleStateStore } from "../application/ports/lifecycle-state-store.js";
import type { ProjectRootAuthorityPort } from "../application/ports/project-root-authority.js";
import type { ProjectTrustPort } from "../application/ports/project-trust.js";
import type { PluginLifecycleService } from "../application/plugin-lifecycle-service.js";
import type { AutomaticUpdateLifecyclePort, AutomaticUpdateLifecycleResult } from "../application/ports/automatic-update-lifecycle.js";

export function createAutomaticUpdateLifecycleAdapter(dependencies: Readonly<{
  state: LifecycleStateStore;
  catalog: Pick<MarketplaceCatalogService, "resolve">;
  inspection: NativeInspectionService;
  evidence: NativeInspectionEvidencePort;
  lifecycle: PluginLifecycleService;
  projectTrust: ProjectTrustPort;
  projectRoots: ProjectRootAuthorityPort;
  currentProject?: Extract<ScopeContext, { kind: "project" }>;
  userBaseDirectory: string;
  sha256: Sha256;
}>): AutomaticUpdateLifecyclePort {
  function context(notice: UpdateNotice): ScopeContext | undefined {
    return notice.scope.kind === "user" ? { kind: "user" } : dependencies.currentProject?.projectKey === notice.scope.projectKey ? dependencies.currentProject : undefined;
  }

  async function target(notice: UpdateNotice, signal: AbortSignal) {
    const scope = context(notice);
    if (scope === undefined) return undefined;
    const loaded = await dependencies.state.read(scope, signal);
    if (!loaded.ok) return undefined;
    const records = "installed" in loaded.snapshot ? loaded.snapshot.installed.plugins : loaded.snapshot.project.plugins;
    const record = records.find((candidate) => candidate.plugin === notice.plugin);
    return record === undefined ? undefined : { scope, snapshot: loaded.snapshot, record };
  }

  async function resolve(notice: UpdateNotice, signal: AbortSignal) {
    return dependencies.catalog.resolve({
      candidateId: MarketplaceCandidateIdSchema.parse(notice.candidateId),
      snapshot: MarketplaceSnapshotTokenSchema.parse(notice.snapshot),
    }, signal);
  }

  const port: AutomaticUpdateLifecyclePort = {
    async inspect(notice, signal) {
      const [resolved, current] = await Promise.all([resolve(notice, signal), target(notice, signal)]);
      if (resolved.kind !== "resolved") return { candidate: "stale", source: "stable", target: "current", project: "trusted", recovery: "clear", configuration: "valid", secrets: "available", capability: "available" };
      const candidate = resolved.candidate;
      const source = deriveMarketplaceSourceIdentity(candidate.marketplace.source.declared, dependencies.sha256) === notice.available.marketplaceSourceIdentity &&
        derivePluginSourceIdentity(candidate.entry.source.value, dependencies.sha256) === notice.available.pluginSourceIdentity ? "stable" as const : "changed" as const;
      if (current === undefined) return { candidate: "current", source, target: "stale", project: "trusted", recovery: "clear", configuration: "valid", secrets: "available", capability: "available" };
      const project = current.scope.kind === "project" && (await dependencies.projectTrust.assess(current.scope.projectKey, signal)).kind !== "trusted" ? "untrusted" as const : "trusted" as const;
      const recovery = current.record.pendingTransition === undefined ? "clear" as const : "required" as const;
      const evidence = await dependencies.evidence.capture(signal);
      const snapshotId = deriveInspectionEvidenceSnapshotId(evidence.binding, dependencies.sha256);
      const detailId = deriveInspectionDetailId({
        version: 1,
        subject: "marketplace-candidate",
        scope: notice.scope,
        plugin: notice.plugin,
        registrationId: MarketplaceRegistrationIdSchema.parse(notice.registrationId),
        candidateId: MarketplaceCandidateIdSchema.parse(notice.candidateId),
        catalogSnapshot: MarketplaceSnapshotTokenSchema.parse(notice.snapshot),
      }, dependencies.sha256);
      const detail = await dependencies.inspection.detail({ snapshotId, detailId }, signal);
      if (detail.kind !== "found") return { candidate: "stale", source, target: "current", project, recovery, configuration: "valid", secrets: "available", capability: "available" };
      const configuration = detail.detail.configuration.some((field) => field.required && ["missing", "invalid"].includes(field.state)) ? "required" as const : "valid" as const;
      const secrets = detail.detail.configuration.some((field) => field.required && field.sensitive && field.state === "unavailable") ? "unavailable" as const : "available" as const;
      const capability = detail.detail.compatibility.status === "incompatible" || detail.detail.compatibility.requirements.some((requirement) => requirement.status === "unavailable") ? "unavailable" as const : "available" as const;
      return { candidate: "current", source, target: "current", project, recovery, configuration, secrets, capability };
    },
    async apply(notice, signal): Promise<AutomaticUpdateLifecycleResult> {
      const [resolved, current] = await Promise.all([resolve(notice, signal), target(notice, signal)]);
      if (resolved.kind !== "resolved" || current === undefined || current.record.pendingTransition !== undefined) return { kind: "stale" };
      const selected = current.record.revisions.find((revision) => revision.revision === current.record.selectedRevision);
      if (selected === undefined) return { kind: "stale" };
      const expectedTarget = LifecycleTargetExpectationSchema.parse({
        generation: current.snapshot.generation,
        plugin: current.record.plugin,
        selectedRevision: current.record.selectedRevision,
        activation: current.record.activation,
        targetDigest: deriveLifecycleTargetDigest(toScopeReference(current.scope), current.record, dependencies.sha256),
        pendingTransition: "none",
      });
      const candidate = resolved.candidate;
      const sourceContext = candidate.entry.source.value.kind === "marketplace-path" ? {
        kind: "marketplace" as const,
        root: candidate.marketplace.root,
        source: candidate.marketplace.source,
        contentRootDigest: candidate.marketplace.content.rootDigest,
        content: candidate.marketplace.content,
        binding: candidate.marketplace.binding,
      } : { kind: "external" as const };
      const configurationPathContext = current.scope.kind === "project"
        ? { scope: current.scope, trustedProjectRoot: await dependencies.projectRoots.acquire(signal) }
        : { scope: current.scope, trustedBaseDirectory: dependencies.userBaseDirectory };
      const result = await dependencies.lifecycle.update({
        scope: current.scope,
        plugin: notice.plugin,
        origin: "automatic-update",
        entry: candidate.entry,
        marketplaceSource: candidate.marketplace.source,
        sourceContext,
        expectedRevision: notice.available.immutableRevision,
        expectedTarget,
        configurationPathContext,
      }, signal);
      switch (result.kind) {
        case "changed":
        case "unchanged":
        case "stale":
        case "rolled-back":
        case "recovery-required":
          return { kind: result.kind };
        case "rejected": {
          const code = result.code === "INCOMPATIBLE" || result.code === "UNTRUSTED" || result.code === "UNCONFIGURED" || result.code === "AVAILABLE_REVISION_CHANGED" || result.code === "CONFIGURATION_STALE" || result.code === "PROJECTION_FAILED" || result.code === "PROMOTION_FAILED" || result.code === "ABORTED"
            ? result.code : "UNTRUSTED";
          return { kind: "rejected", code };
        }
      }
    },
  };
  return Object.freeze(port);
}
