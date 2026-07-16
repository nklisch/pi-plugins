import { InstalledRevisionRecordSchema, type InstalledRevisionRecord } from "../domain/state/installed-state.js";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import { ScopeReferenceSchema, type ScopeReference } from "../domain/state/scope.js";
import { StableSourceIdentitySchema, AvailableRevisionSchema, deriveUpdateCandidateKey, displayVersion, compareInstalledRevision, type AvailableRevision, type InstalledRevisionDescriptor } from "../domain/update-policy.js";
import type { Sha256 } from "../domain/source.js";
import { PluginUpdateOutcomeSchema, type PluginUpdateOutcome } from "./update-contract.js";

function installedDescriptor(record: InstalledRevisionRecord): InstalledRevisionDescriptor {
  const source = record.evidence.source;
  return {
    immutableRevision: record.revision,
    marketplaceSourceIdentity: StableSourceIdentitySchema.parse(source.marketplaceSourceIdentity ?? "legacy-unavailable"),
    pluginSourceIdentity: StableSourceIdentitySchema.parse(source.pluginSourceIdentity ?? "legacy-unavailable"),
    ...(source.declaredVersion === undefined ? {} : { declaredVersion: source.declaredVersion }),
    sourceRevision: source.sourceRevision ?? (source.kind === "marketplace-path" ? source.marketplaceRevision : source.kind === "npm" ? "legacy-unavailable" : source.revision),
  };
}

export function inspectUpdateCandidate(input: Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  installed: InstalledRevisionRecord;
  available: AvailableRevision;
  sha256: Sha256;
}>): PluginUpdateOutcome {
  const scope = ScopeReferenceSchema.parse(input.scope);
  const plugin = PluginKeySchema.parse(input.plugin);
  const installed = InstalledRevisionRecordSchema.parse(input.installed);
  const available = AvailableRevisionSchema.parse(input.available);
  const candidate = deriveUpdateCandidateKey({
    scope,
    plugin,
    marketplaceSourceIdentity: available.marketplaceSourceIdentity,
    pluginSourceIdentity: available.pluginSourceIdentity,
    immutableRevision: available.immutableRevision,
  }, input.sha256);
  const comparison = compareInstalledRevision({ installed: installedDescriptor(installed), available });
  if (comparison.kind === "current") return PluginUpdateOutcomeSchema.parse({ plugin, disposition: "current", candidate });
  if (comparison.kind === "approval-required") return PluginUpdateOutcomeSchema.parse({ plugin, disposition: "approval-required", candidate });
  return PluginUpdateOutcomeSchema.parse({
    plugin,
    disposition: "discovered",
    candidate,
    available,
  });
}

export function displayInstalledRevision(record: InstalledRevisionRecord): string {
  const source = record.evidence.source;
  return displayVersion({
    ...(source.declaredVersion === undefined ? {} : { declaredVersion: source.declaredVersion }),
    sourceRevision: source.sourceRevision ?? (source.kind === "marketplace-path" ? source.marketplaceRevision : source.kind === "npm" ? "legacy-unavailable" : source.revision),
  });
}

export function candidateAvailableRevision(input: Readonly<{
  immutableRevision: string;
  marketplaceSourceIdentity: string;
  pluginSourceIdentity: string;
  declaredVersion?: string;
  sourceRevision: string;
}>): AvailableRevision {
  return {
    immutableRevision: input.immutableRevision as AvailableRevision["immutableRevision"],
    marketplaceSourceIdentity: input.marketplaceSourceIdentity as AvailableRevision["marketplaceSourceIdentity"],
    pluginSourceIdentity: input.pluginSourceIdentity as AvailableRevision["pluginSourceIdentity"],
    ...(input.declaredVersion === undefined ? {} : { declaredVersion: input.declaredVersion }),
    sourceRevision: input.sourceRevision,
  };
}
