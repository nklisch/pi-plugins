import { z } from "zod";
import {
  ContentDigestSchema,
  type ContentDigest,
  hashContent,
} from "./content-manifest.js";
import {
  MarketplaceNameSchema,
  PluginKeySchema,
  type MarketplaceName,
  type PluginKey,
} from "./identity.js";
import {
  MarketplaceSourceSchema,
  PluginSourceSchema,
  CanonicalSourceSchema,
  hashCanonicalSource,
  serializeMarketplaceSource,
  serializePluginSource,
  SourceHashSchema,
  type MarketplaceSource,
  type PluginSource,
  type Sha256,
  type SourceHash,
} from "./source.js";
import { ScopeReferenceSchema, type ScopeReference } from "./state/scope.js";
import { EpochMillisecondsSchema, type EpochMilliseconds } from "./time.js";

export const UpdateCandidateKeySchema = z
  .string()
  .regex(/^update-candidate-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdateCandidateKey">();
export type UpdateCandidateKey = z.infer<typeof UpdateCandidateKeySchema>;

export const RefreshClaimIdSchema = z
  .string()
  .regex(/^refresh-claim-v1:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .brand<"RefreshClaimId">();
export type RefreshClaimId = z.infer<typeof RefreshClaimIdSchema>;

export const StableSourceIdentitySchema = z.union([
  SourceHashSchema,
  z.literal("legacy-unavailable"),
]);
export type StableSourceIdentity = z.infer<typeof StableSourceIdentitySchema>;

export const AvailableRevisionSchema = z.object({
  immutableRevision: ContentDigestSchema,
  marketplaceSourceIdentity: SourceHashSchema,
  pluginSourceIdentity: SourceHashSchema,
  declaredVersion: z.string().min(1).optional(),
  sourceRevision: z.string().min(1),
}).strict().readonly();
export type AvailableRevision = z.infer<typeof AvailableRevisionSchema>;

export const MarketplaceRefreshMemorySchema = z.object({
  claim: z.object({
    id: RefreshClaimIdSchema,
    startedAt: EpochMillisecondsSchema,
    expiresAt: EpochMillisecondsSchema,
  }).strict().readonly().optional(),
  lastCompletedAt: EpochMillisecondsSchema.optional(),
  nextScheduledAt: EpochMillisecondsSchema.default(0),
  consecutiveFailures: z.number().int().nonnegative().safe().default(0),
}).strict().readonly();
export type MarketplaceRefreshMemory = z.infer<typeof MarketplaceRefreshMemorySchema>;

export const UpdateNotificationMemorySchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  candidate: UpdateCandidateKeySchema,
  available: AvailableRevisionSchema.optional(),
  display: z.object({ installed: z.string().min(1), available: z.string().min(1) }).strict().readonly(),
  phase: z.enum(["discovered", "emitted"]),
  disposition: z.enum([
    "manual-required", "approval-required", "automatic-applied",
    "automatic-retryable", "recovery-required",
  ]).optional(),
}).strict().readonly();
export type UpdateNotificationMemory = z.infer<typeof UpdateNotificationMemorySchema>;

export const MarketplaceUpdateRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: z.enum(["manual", "automatic"]),
  refresh: MarketplaceRefreshMemorySchema.default({}),
  notifications: z.array(UpdateNotificationMemorySchema).readonly().default([]),
}).strict().readonly().superRefine((record, context) => {
  if (record.source.kind === "local-git" && record.updateApplication === "automatic") {
    context.addIssue({ code: "custom", path: ["updateApplication"], message: "local marketplaces cannot use automatic updates" });
  }
  const seen = new Set<string>();
  for (const [index, notification] of record.notifications.entries()) {
    if (notification.scope.kind !== "user" && notification.scope.kind !== "project") {
      context.addIssue({ code: "custom", path: ["notifications", index, "scope"], message: "notification scope is invalid" });
    }
    if (notification.plugin.slice(notification.plugin.lastIndexOf("@") + 1) !== record.marketplace) {
      context.addIssue({ code: "custom", path: ["notifications", index, "plugin"], message: "notification plugin belongs to another marketplace" });
    }
    const key = `${JSON.stringify(notification.scope)}\0${notification.plugin}`;
    if (seen.has(key)) context.addIssue({ code: "custom", path: ["notifications", index], message: "notification must be unique per scope and plugin" });
    seen.add(key);
  }
});
export type MarketplaceUpdateRecord = z.infer<typeof MarketplaceUpdateRecordSchema>;

export const UpdateApplicationPreferenceSchema = z.enum(["manual", "automatic"]);
export type UpdateApplicationPreference = z.infer<typeof UpdateApplicationPreferenceSchema>;

export type RevisionComparison =
  | Readonly<{ kind: "current"; installed: InstalledRevisionDescriptor }>
  | Readonly<{
      kind: "revision-changed";
      installed: InstalledRevisionDescriptor;
      available: AvailableRevision;
      displayVersionChanged: boolean;
    }>
  | Readonly<{
      kind: "approval-required";
      reason: "MARKETPLACE_SOURCE_CHANGED" | "PLUGIN_SOURCE_CHANGED" | "LEGACY_SOURCE_IDENTITY";
      candidate: UpdateCandidateKey;
    }>;

export type InstalledRevisionDescriptor = Readonly<{
  immutableRevision: ContentDigest;
  marketplaceSourceIdentity: StableSourceIdentity;
  pluginSourceIdentity: StableSourceIdentity;
  declaredVersion?: string;
  sourceRevision: string;
}>;

function digestText(value: string, sha256: Sha256): string {
  return hashContent(new TextEncoder().encode(value), sha256);
}

function sourceHash(value: string, sha256: Sha256): SourceHash {
  return hashCanonicalSource(CanonicalSourceSchema.parse(value), sha256);
}

/** Hash a declared marketplace source; aliases and display names are excluded. */
export function deriveMarketplaceSourceIdentity(source: MarketplaceSource, sha256: Sha256): SourceHash {
  return sourceHash(serializeMarketplaceSource(MarketplaceSourceSchema.parse(source)), sha256);
}

/** Hash a declared plugin source; this is intentionally not a resolved revision. */
export function derivePluginSourceIdentity(source: PluginSource, sha256: Sha256): SourceHash {
  return sourceHash(serializePluginSource(PluginSourceSchema.parse(source)), sha256);
}

export function deriveUpdateCandidateKey(input: Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  marketplaceSourceIdentity: StableSourceIdentity;
  pluginSourceIdentity: StableSourceIdentity;
  immutableRevision?: ContentDigest;
  changedDeclaration?: unknown;
}>, sha256: Sha256): UpdateCandidateKey {
  const scope = ScopeReferenceSchema.parse(input.scope);
  const plugin = PluginKeySchema.parse(input.plugin);
  const immutableRevision = input.immutableRevision === undefined ? undefined : ContentDigestSchema.parse(input.immutableRevision);
  if (immutableRevision === undefined && input.changedDeclaration === undefined) throw new TypeError("candidate key requires an immutable revision or changed declaration");
  const preimage = JSON.stringify({
    version: "update-candidate-v1",
    scope,
    plugin,
    marketplaceSourceIdentity: StableSourceIdentitySchema.parse(input.marketplaceSourceIdentity),
    pluginSourceIdentity: StableSourceIdentitySchema.parse(input.pluginSourceIdentity),
    ...(immutableRevision === undefined ? { changedDeclaration: input.changedDeclaration } : { immutableRevision }),
  });
  return UpdateCandidateKeySchema.parse(`update-candidate-v1:sha256:${digestText(preimage, sha256).slice("sha256:".length)}`);
}

export function selectDeclaredVersion(input: Readonly<{ plugin?: string; marketplace?: string }>): string | undefined {
  return input.plugin ?? input.marketplace;
}

export function displayVersion(input: Readonly<{ declaredVersion?: string; sourceRevision?: string; resolvedVersion?: string }>): string {
  return input.declaredVersion ?? input.sourceRevision ?? input.resolvedVersion ?? "unknown";
}

export function compareInstalledRevision(input: Readonly<{
  installed: InstalledRevisionDescriptor;
  available: AvailableRevision;
}>): RevisionComparison {
  const installed = {
    immutableRevision: ContentDigestSchema.parse(input.installed.immutableRevision),
    marketplaceSourceIdentity: StableSourceIdentitySchema.parse(input.installed.marketplaceSourceIdentity),
    pluginSourceIdentity: StableSourceIdentitySchema.parse(input.installed.pluginSourceIdentity),
    ...(input.installed.declaredVersion === undefined ? {} : { declaredVersion: input.installed.declaredVersion }),
    sourceRevision: z.string().min(1).parse(input.installed.sourceRevision),
  } satisfies InstalledRevisionDescriptor;
  const available = AvailableRevisionSchema.parse(input.available);
  if (installed.marketplaceSourceIdentity === "legacy-unavailable" || installed.pluginSourceIdentity === "legacy-unavailable") {
    return { kind: "approval-required", reason: "LEGACY_SOURCE_IDENTITY", candidate: deriveUpdateCandidateKey({
      scope: { kind: "user" }, plugin: PluginKeySchema.parse("legacy@legacy"), marketplaceSourceIdentity: available.marketplaceSourceIdentity,
      pluginSourceIdentity: available.pluginSourceIdentity, immutableRevision: available.immutableRevision,
    }, (_bytes) => new Uint8Array(32)) };
  }
  if (installed.marketplaceSourceIdentity !== available.marketplaceSourceIdentity) {
    return { kind: "approval-required", reason: "MARKETPLACE_SOURCE_CHANGED", candidate: deriveUpdateCandidateKey({
      scope: { kind: "user" }, plugin: PluginKeySchema.parse("legacy@legacy"), marketplaceSourceIdentity: available.marketplaceSourceIdentity,
      pluginSourceIdentity: available.pluginSourceIdentity, immutableRevision: available.immutableRevision,
    }, (_bytes) => new Uint8Array(32)) };
  }
  if (installed.pluginSourceIdentity !== available.pluginSourceIdentity) {
    return { kind: "approval-required", reason: "PLUGIN_SOURCE_CHANGED", candidate: deriveUpdateCandidateKey({
      scope: { kind: "user" }, plugin: PluginKeySchema.parse("legacy@legacy"), marketplaceSourceIdentity: available.marketplaceSourceIdentity,
      pluginSourceIdentity: available.pluginSourceIdentity, immutableRevision: available.immutableRevision,
    }, (_bytes) => new Uint8Array(32)) };
  }
  if (installed.immutableRevision === available.immutableRevision) return { kind: "current", installed };
  return {
    kind: "revision-changed",
    installed,
    available,
    displayVersionChanged: displayVersion({
      ...(installed.declaredVersion === undefined ? {} : { declaredVersion: installed.declaredVersion }),
      sourceRevision: installed.sourceRevision,
    }) !== displayVersion({
      ...(available.declaredVersion === undefined ? {} : { declaredVersion: available.declaredVersion }),
      sourceRevision: available.sourceRevision,
    }),
  };
}

export function backoffDelayMs(failures: number, baseMs: number, maxMs: number): number {
  const count = Math.max(0, Math.trunc(failures));
  if (count === 0) return 0;
  return Math.min(maxMs, baseMs * 2 ** Math.min(count - 1, 31));
}

export function createMarketplaceConfigurationRecord(input: Readonly<{
  marketplace: MarketplaceName;
  source: MarketplaceSource;
  updateApplication?: UpdateApplicationPreference;
  refresh?: Partial<MarketplaceRefreshMemory>;
  notifications?: readonly UpdateNotificationMemory[];
}>): MarketplaceUpdateRecord {
  const source = MarketplaceSourceSchema.parse(input.source);
  const refresh = MarketplaceRefreshMemorySchema.parse({ nextScheduledAt: 0, consecutiveFailures: 0, ...input.refresh });
  const updateApplication = source.kind === "local-git" ? "manual" : input.updateApplication ?? "manual";
  return MarketplaceUpdateRecordSchema.parse({ marketplace: MarketplaceNameSchema.parse(input.marketplace), source, updateApplication, refresh, notifications: input.notifications ?? [] });
}

export function replaceMarketplaceConfigurationSource(record: MarketplaceUpdateRecord, source: MarketplaceSource): MarketplaceUpdateRecord {
  const nextSource = MarketplaceSourceSchema.parse(source);
  if (JSON.stringify(record.source) === JSON.stringify(nextSource)) return MarketplaceUpdateRecordSchema.parse(record);
  return createMarketplaceConfigurationRecord({ marketplace: record.marketplace, source: nextSource });
}

export type { ContentDigest, EpochMilliseconds, MarketplaceName, MarketplaceSource, PluginKey, PluginSource, ScopeReference, SourceHash };
