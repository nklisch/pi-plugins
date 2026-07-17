import { z } from "zod";
import { canonicalJson } from "./canonical-json.js";
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
import { AdoptionCandidateIdSchema } from "./adoption.js";

export const MarketplaceRegistrationOriginSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("native") }).strict().readonly(),
  z.object({
    kind: z.literal("adoption"),
    candidateId: AdoptionCandidateIdSchema,
    documents: z.array(z.object({
      host: z.enum(["claude", "codex"]),
      document: z.enum(["claude-known-marketplaces", "claude-user-settings", "codex-user-config"]),
      pointer: z.string().optional(),
    }).strict().readonly()).nonempty().readonly(),
  }).strict().readonly(),
  z.object({ kind: z.literal("legacy") }).strict().readonly(),
]);
export type MarketplaceRegistrationOrigin = z.infer<typeof MarketplaceRegistrationOriginSchema>;

export const MarketplaceRefreshAttemptSchema = z.object({
  completedAt: EpochMillisecondsSchema,
  outcome: z.enum(["succeeded", "unchanged", "cancelled", "unavailable", "failed"]),
  code: z.enum([
    "SOURCE_UNAVAILABLE", "CATALOG_INVALID", "CONTENT_INVALID", "PROMOTION_FAILED",
    "STATE_STALE", "REMOVED_DURING_REFRESH", "ABORTED",
  ]).optional(),
}).strict().readonly();
export type MarketplaceRefreshAttempt = z.infer<typeof MarketplaceRefreshAttemptSchema>;

export const UpdateCandidateKeySchema = z.string()
  .regex(/^update-candidate-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdateCandidateKey">();
export type UpdateCandidateKey = z.infer<typeof UpdateCandidateKeySchema>;

export const RefreshClaimIdSchema = z.string()
  .regex(/^refresh-claim-v1:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .brand<"RefreshClaimId">();
export type RefreshClaimId = z.infer<typeof RefreshClaimIdSchema>;

export const UpdateSchedulerLeaseIdSchema = z.string()
  .regex(/^update-scheduler-lease-v1:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .brand<"UpdateSchedulerLeaseId">();
export type UpdateSchedulerLeaseId = z.infer<typeof UpdateSchedulerLeaseIdSchema>;

export const UpdateNoticeIdSchema = z.string()
  .regex(/^update-notice-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdateNoticeId">();
export type UpdateNoticeId = z.infer<typeof UpdateNoticeIdSchema>;

export const UpdatePolicyPreviewIdSchema = z.string()
  .regex(/^update-policy-preview-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdatePolicyPreviewId">();
export type UpdatePolicyPreviewId = z.infer<typeof UpdatePolicyPreviewIdSchema>;

export const UpdatePolicyConsentIdSchema = z.string()
  .regex(/^update-policy-consent-v1:sha256:[0-9a-f]{64}$/)
  .brand<"UpdatePolicyConsentId">();
export type UpdatePolicyConsentId = z.infer<typeof UpdatePolicyConsentIdSchema>;

export const StableSourceIdentitySchema = z.union([SourceHashSchema, z.literal("legacy-unavailable")]);
export type StableSourceIdentity = z.infer<typeof StableSourceIdentitySchema>;

export const AvailableRevisionSchema = z.object({
  immutableRevision: ContentDigestSchema,
  marketplaceSourceIdentity: SourceHashSchema,
  pluginSourceIdentity: SourceHashSchema,
  declaredVersion: z.string().min(1).optional(),
  sourceRevision: z.string().min(1),
}).strict().readonly();
export type AvailableRevision = z.infer<typeof AvailableRevisionSchema>;

export const UpdateApplicationModeSchema = z.enum(["manual", "automatic"]);
export type UpdateApplicationMode = z.infer<typeof UpdateApplicationModeSchema>;
/** Compatibility spelling retained for the former scalar setting. */
export const UpdateApplicationPreferenceSchema = UpdateApplicationModeSchema;
export type UpdateApplicationPreference = UpdateApplicationMode;

export const UpdateApplicationOverrideSchema = z.enum(["inherit", "manual", "automatic"]);
export type UpdateApplicationOverride = z.infer<typeof UpdateApplicationOverrideSchema>;

export const UpdateCadenceRegistry = Object.freeze({
  paused: Object.freeze({ successIntervalMs: 0, jitterMs: 0, failureBaseMs: 5 * 60_000, failureMaxMs: 6 * 60 * 60_000 }),
  conservative: Object.freeze({ successIntervalMs: 24 * 60 * 60_000, jitterMs: 2 * 60 * 60_000, failureBaseMs: 15 * 60_000, failureMaxMs: 24 * 60 * 60_000 }),
  balanced: Object.freeze({ successIntervalMs: 6 * 60 * 60_000, jitterMs: 30 * 60_000, failureBaseMs: 5 * 60_000, failureMaxMs: 6 * 60 * 60_000 }),
  frequent: Object.freeze({ successIntervalMs: 60 * 60_000, jitterMs: 5 * 60_000, failureBaseMs: 60_000, failureMaxMs: 60 * 60_000 }),
} as const);
export const UpdateCadenceSchema = z.enum(Object.keys(UpdateCadenceRegistry) as [keyof typeof UpdateCadenceRegistry, ...(keyof typeof UpdateCadenceRegistry)[]]);
export type UpdateCadence = z.infer<typeof UpdateCadenceSchema>;

export const UpdatePolicyTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }).strict().readonly(),
  z.object({ kind: z.literal("scope"), scope: ScopeReferenceSchema }).strict().readonly(),
  z.object({
    kind: z.literal("marketplace"),
    scope: ScopeReferenceSchema,
    registrationId: z.string().regex(/^marketplace-registration-v1:sha256:[0-9a-f]{64}$/),
  }).strict().readonly(),
  z.object({ kind: z.literal("plugin"), scope: ScopeReferenceSchema, plugin: PluginKeySchema }).strict().readonly(),
]);
export type UpdatePolicyTarget = z.infer<typeof UpdatePolicyTargetSchema>;

export const UpdatePolicyChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("application"), target: UpdatePolicyTargetSchema, mode: UpdateApplicationOverrideSchema }).strict().readonly(),
  z.object({
    kind: z.literal("cadence"),
    target: z.object({ kind: z.literal("global") }).strict().readonly(),
    cadence: UpdateCadenceSchema,
  }).strict().readonly(),
]).superRefine((change, context) => {
  if (change.kind === "application" && change.target.kind === "global" && change.mode === "inherit") {
    context.addIssue({ code: "custom", path: ["mode"], message: "global application policy cannot inherit" });
  }
});
export type UpdatePolicyChange = z.infer<typeof UpdatePolicyChangeSchema>;

export const UpdateScheduleMemorySchema = z.object({
  anchorAt: EpochMillisecondsSchema,
  baseDelayMs: z.number().int().positive().safe(),
  jitterMs: z.number().int().safe(),
  dueAt: EpochMillisecondsSchema,
  reason: z.enum(["success", "failure", "legacy"]),
}).strict().readonly().superRefine((schedule, context) => {
  if (schedule.dueAt !== schedule.anchorAt + schedule.baseDelayMs + schedule.jitterMs) {
    context.addIssue({ code: "custom", path: ["dueAt"], message: "schedule due time must equal its persisted timing components" });
  }
});
export type UpdateScheduleMemory = z.infer<typeof UpdateScheduleMemorySchema>;

export const UpdateSchedulerLeaseSchema = z.object({
  id: UpdateSchedulerLeaseIdSchema,
  startedAt: EpochMillisecondsSchema,
  renewedAt: EpochMillisecondsSchema,
  expiresAt: EpochMillisecondsSchema,
}).strict().readonly().superRefine((lease, context) => {
  if (lease.renewedAt < lease.startedAt) context.addIssue({ code: "custom", path: ["renewedAt"], message: "lease renewal cannot precede start" });
  if (lease.expiresAt <= lease.renewedAt) context.addIssue({ code: "custom", path: ["expiresAt"], message: "lease expiry must follow renewal" });
});
export type UpdateSchedulerLease = z.infer<typeof UpdateSchedulerLeaseSchema>;

export const MarketplaceRefreshMemorySchema = z.object({
  claim: z.object({
    id: RefreshClaimIdSchema,
    startedAt: EpochMillisecondsSchema,
    expiresAt: EpochMillisecondsSchema,
  }).strict().readonly().superRefine((claim, context) => {
    if (claim.expiresAt <= claim.startedAt) context.addIssue({ code: "custom", path: ["expiresAt"], message: "refresh claim expiry must follow start" });
  }).optional(),
  lastCompletedAt: EpochMillisecondsSchema.optional(),
  lastAttempt: MarketplaceRefreshAttemptSchema.optional(),
  schedule: UpdateScheduleMemorySchema.optional(),
  consecutiveFailures: z.number().int().nonnegative().safe().default(0),
}).strict().readonly();
export type MarketplaceRefreshMemory = z.infer<typeof MarketplaceRefreshMemorySchema>;

/** Exact v2/v3 refresh persistence retained only for migration. */
export const MarketplaceRefreshMemorySchemaV3 = z.object({
  claim: z.object({ id: RefreshClaimIdSchema, startedAt: EpochMillisecondsSchema, expiresAt: EpochMillisecondsSchema }).strict().readonly().optional(),
  lastCompletedAt: EpochMillisecondsSchema.optional(),
  lastAttempt: MarketplaceRefreshAttemptSchema.optional(),
  nextScheduledAt: EpochMillisecondsSchema.default(0),
  consecutiveFailures: z.number().int().nonnegative().safe().default(0),
}).strict().readonly();
export type MarketplaceRefreshMemoryV3 = z.infer<typeof MarketplaceRefreshMemorySchemaV3>;

/** Retained v3 notification input. Current code uses UpdateNoticeSchema. */
export const UpdateNotificationMemorySchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  candidate: UpdateCandidateKeySchema,
  available: AvailableRevisionSchema.optional(),
  display: z.object({ installed: z.string().min(1), available: z.string().min(1) }).strict().readonly(),
  phase: z.enum(["discovered", "emitted"]),
  disposition: z.enum(["manual-required", "approval-required", "automatic-applied", "automatic-retryable", "recovery-required"]).optional(),
}).strict().readonly();
export type UpdateNotificationMemory = z.infer<typeof UpdateNotificationMemorySchema>;

export const AutomaticUpdateReasonSchema = z.enum([
  "manual", "approval-required", "stale", "project-untrusted", "recovery-required",
  "configuration-required", "secret-unavailable", "capability-unavailable",
  "awaiting-host-context", "retryable",
]);
export type AutomaticUpdateReason = z.infer<typeof AutomaticUpdateReasonSchema>;

export const AutomaticUpdateAttemptMemorySchema = z.object({
  state: z.enum(["pending", "blocked", "retryable", "applied", "recovery-required"]),
  reason: AutomaticUpdateReasonSchema.optional(),
  attemptedAt: EpochMillisecondsSchema.optional(),
  retryAt: EpochMillisecondsSchema.optional(),
}).strict().readonly().superRefine((memory, context) => {
  if (memory.state === "applied" && memory.reason !== undefined) context.addIssue({ code: "custom", path: ["reason"], message: "applied automatic update cannot have a blocked reason" });
  if (memory.state === "retryable" && memory.retryAt === undefined) context.addIssue({ code: "custom", path: ["retryAt"], message: "retryable automatic update requires retry timing" });
  if (memory.state !== "retryable" && memory.retryAt !== undefined) context.addIssue({ code: "custom", path: ["retryAt"], message: "only retryable automatic update has retry timing" });
});
export type AutomaticUpdateAttemptMemory = z.infer<typeof AutomaticUpdateAttemptMemorySchema>;

export const UpdateNoticeDispositionSchema = z.enum([
  "manual-required", "approval-required", "automatic-pending", "automatic-applied",
  "automatic-retryable", "configuration-blocked", "capability-blocked",
  "recovery-required",
]);
export type UpdateNoticeDisposition = z.infer<typeof UpdateNoticeDispositionSchema>;

export const UpdateNoticeResolutionKindSchema = z.enum(["installed", "superseded", "plugin-removed", "marketplace-removed"]);
export type UpdateNoticeResolutionKind = z.infer<typeof UpdateNoticeResolutionKindSchema>;

export const UpdateNoticeSchema = z.object({
  id: UpdateNoticeIdSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  registrationId: z.string().regex(/^marketplace-registration-v1:sha256:[0-9a-f]{64}$/),
  snapshot: z.string().regex(/^marketplace-snapshot-v1:sha256:[0-9a-f]{64}$/),
  candidateId: z.string().regex(/^marketplace-candidate-v1:sha256:[0-9a-f]{64}$/),
  candidate: UpdateCandidateKeySchema,
  available: AvailableRevisionSchema,
  display: z.object({ installed: z.string().min(1), available: z.string().min(1) }).strict().readonly(),
  disposition: UpdateNoticeDispositionSchema,
  publication: z.enum(["pending", "published"]),
  unread: z.boolean(),
  discoveredAt: EpochMillisecondsSchema,
  acknowledgedAt: EpochMillisecondsSchema.optional(),
  resolution: z.object({ kind: UpdateNoticeResolutionKindSchema, at: EpochMillisecondsSchema }).strict().readonly().optional(),
  automatic: AutomaticUpdateAttemptMemorySchema.optional(),
}).strict().readonly().superRefine((notice, context) => {
  if (notice.unread === (notice.acknowledgedAt !== undefined)) {
    context.addIssue({ code: "custom", path: ["acknowledgedAt"], message: "acknowledgment timestamp must exist exactly when a notice is read" });
  }
  if (notice.acknowledgedAt !== undefined && notice.acknowledgedAt < notice.discoveredAt) {
    context.addIssue({ code: "custom", path: ["acknowledgedAt"], message: "notice cannot be acknowledged before discovery" });
  }
  if (notice.resolution !== undefined && notice.resolution.at < notice.discoveredAt) {
    context.addIssue({ code: "custom", path: ["resolution", "at"], message: "notice cannot resolve before discovery" });
  }
  if (notice.automatic?.state === "applied" && notice.resolution?.kind !== "installed") {
    context.addIssue({ code: "custom", path: ["resolution"], message: "applied automatic update requires installed resolution" });
  }
});
export type UpdateNotice = z.infer<typeof UpdateNoticeSchema>;

export const PluginUpdatePolicyOverrideSchema = z.object({
  plugin: PluginKeySchema,
  sourceIdentity: StableSourceIdentitySchema,
  mode: UpdateApplicationOverrideSchema,
}).strict().readonly();
export type PluginUpdatePolicyOverride = z.infer<typeof PluginUpdatePolicyOverrideSchema>;

const MarketplaceUpdateRecordShapeV3 = {
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  updateApplication: UpdateApplicationPreferenceSchema,
  refresh: MarketplaceRefreshMemorySchemaV3.default(() => ({ nextScheduledAt: 0, consecutiveFailures: 0 })),
  notifications: z.array(UpdateNotificationMemorySchema).readonly().default([]),
} as const;
export const MarketplaceUpdateRecordSchemaV2 = z.object(MarketplaceUpdateRecordShapeV3).strict().readonly();
export type MarketplaceUpdateRecordV2 = z.infer<typeof MarketplaceUpdateRecordSchemaV2>;

export const MarketplaceRegistrationRecordSchemaV3 = z.object({
  ...MarketplaceUpdateRecordShapeV3,
  origin: MarketplaceRegistrationOriginSchema,
}).strict().readonly();
export type MarketplaceRegistrationRecordV3 = z.infer<typeof MarketplaceRegistrationRecordSchemaV3>;

export const MarketplaceRegistrationRecordSchema = z.object({
  marketplace: MarketplaceNameSchema,
  source: MarketplaceSourceSchema,
  origin: MarketplaceRegistrationOriginSchema,
  applicationOverride: UpdateApplicationOverrideSchema.optional(),
  pluginOverrides: z.array(PluginUpdatePolicyOverrideSchema).readonly().default([]),
  refresh: MarketplaceRefreshMemorySchema.default(() => ({ consecutiveFailures: 0 })),
  notices: z.array(UpdateNoticeSchema).readonly().default([]),
}).strict().readonly().superRefine((record, context) => {
  if (record.source.kind === "local-git" && record.applicationOverride === "automatic") {
    context.addIssue({ code: "custom", path: ["applicationOverride"], message: "local marketplaces cannot use automatic updates" });
  }
  const overridePlugins = new Set<string>();
  for (const [index, override] of record.pluginOverrides.entries()) {
    if (!override.plugin.endsWith(`@${record.marketplace}`)) context.addIssue({ code: "custom", path: ["pluginOverrides", index, "plugin"], message: "plugin override belongs to another marketplace" });
    if (overridePlugins.has(override.plugin)) context.addIssue({ code: "custom", path: ["pluginOverrides", index, "plugin"], message: "duplicate plugin override" });
    overridePlugins.add(override.plugin);
  }
  const ids = new Set<string>();
  const candidates = new Set<string>();
  for (const [index, notice] of record.notices.entries()) {
    if (!notice.plugin.endsWith(`@${record.marketplace}`)) context.addIssue({ code: "custom", path: ["notices", index, "plugin"], message: "notice plugin belongs to another marketplace" });
    if (ids.has(notice.id)) context.addIssue({ code: "custom", path: ["notices", index, "id"], message: "duplicate notice identity" });
    if (candidates.has(notice.candidate)) context.addIssue({ code: "custom", path: ["notices", index, "candidate"], message: "duplicate exact candidate notice" });
    ids.add(notice.id);
    candidates.add(notice.candidate);
  }
});
export type MarketplaceRegistrationRecord = z.infer<typeof MarketplaceRegistrationRecordSchema>;
export const MarketplaceUpdateRecordSchema = MarketplaceRegistrationRecordSchema;
export type MarketplaceUpdateRecord = MarketplaceRegistrationRecord;

export type RevisionComparison =
  | Readonly<{ kind: "current"; installed: InstalledRevisionDescriptor }>
  | Readonly<{ kind: "revision-changed"; installed: InstalledRevisionDescriptor; available: AvailableRevision; displayVersionChanged: boolean }>
  | Readonly<{ kind: "approval-required"; reason: "MARKETPLACE_SOURCE_CHANGED" | "PLUGIN_SOURCE_CHANGED" | "LEGACY_SOURCE_IDENTITY"; installed: InstalledRevisionDescriptor; available: AvailableRevision }>;

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

export function deriveMarketplaceSourceIdentity(source: MarketplaceSource, sha256: Sha256): SourceHash {
  return sourceHash(serializeMarketplaceSource(MarketplaceSourceSchema.parse(source)), sha256);
}

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
  const preimage = canonicalJson({
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

export function compareInstalledRevision(input: Readonly<{ installed: InstalledRevisionDescriptor; available: AvailableRevision }>): RevisionComparison {
  const installed = {
    immutableRevision: ContentDigestSchema.parse(input.installed.immutableRevision),
    marketplaceSourceIdentity: StableSourceIdentitySchema.parse(input.installed.marketplaceSourceIdentity),
    pluginSourceIdentity: StableSourceIdentitySchema.parse(input.installed.pluginSourceIdentity),
    ...(input.installed.declaredVersion === undefined ? {} : { declaredVersion: input.installed.declaredVersion }),
    sourceRevision: z.string().min(1).parse(input.installed.sourceRevision),
  } satisfies InstalledRevisionDescriptor;
  const available = AvailableRevisionSchema.parse(input.available);
  if (installed.marketplaceSourceIdentity === "legacy-unavailable" || installed.pluginSourceIdentity === "legacy-unavailable") return { kind: "approval-required", reason: "LEGACY_SOURCE_IDENTITY", installed, available };
  if (installed.marketplaceSourceIdentity !== available.marketplaceSourceIdentity) return { kind: "approval-required", reason: "MARKETPLACE_SOURCE_CHANGED", installed, available };
  if (installed.pluginSourceIdentity !== available.pluginSourceIdentity) return { kind: "approval-required", reason: "PLUGIN_SOURCE_CHANGED", installed, available };
  if (installed.immutableRevision === available.immutableRevision) return { kind: "current", installed };
  return {
    kind: "revision-changed",
    installed,
    available,
    displayVersionChanged: displayVersion({ ...(installed.declaredVersion === undefined ? {} : { declaredVersion: installed.declaredVersion }), sourceRevision: installed.sourceRevision }) !==
      displayVersion({ ...(available.declaredVersion === undefined ? {} : { declaredVersion: available.declaredVersion }), sourceRevision: available.sourceRevision }),
  };
}

export function backoffDelayMs(failures: number, baseMs: number, maxMs: number): number {
  const count = Math.max(0, Math.trunc(failures));
  if (count === 0) return 0;
  return Math.min(maxMs, baseMs * 2 ** Math.min(count - 1, 31));
}

function legacySchedule(nextScheduledAt: number): UpdateScheduleMemory | undefined {
  return nextScheduledAt <= 0 ? undefined : UpdateScheduleMemorySchema.parse({ anchorAt: 0, baseDelayMs: nextScheduledAt, jitterMs: 0, dueAt: nextScheduledAt, reason: "legacy" });
}

function digestSuffix(value: string): string {
  const match = /:sha256:([0-9a-f]{64})$/.exec(value);
  return match?.[1] ?? "0".repeat(64);
}

/** Deterministic and loss-preserving enough to retain legacy notice evidence without claiming exact catalog authority. */
export function migrateMarketplaceRegistrationRecordV3(recordInput: MarketplaceRegistrationRecordV3): MarketplaceRegistrationRecord {
  const record = MarketplaceRegistrationRecordSchemaV3.parse(recordInput);
  const notices = record.notifications.flatMap((notification) => {
    if (notification.available === undefined) return [];
    const suffix = digestSuffix(notification.candidate);
    return [UpdateNoticeSchema.parse({
      id: `update-notice-v1:sha256:${suffix}`,
      scope: notification.scope,
      plugin: notification.plugin,
      registrationId: `marketplace-registration-v1:sha256:${suffix}`,
      snapshot: `marketplace-snapshot-v1:sha256:${suffix}`,
      candidateId: `marketplace-candidate-v1:sha256:${suffix}`,
      candidate: notification.candidate,
      available: notification.available,
      display: notification.display,
      disposition: notification.disposition === "automatic-applied" ? "automatic-applied" :
        notification.disposition === "automatic-retryable" ? "automatic-retryable" :
        notification.disposition === "recovery-required" ? "recovery-required" :
        notification.disposition === "approval-required" ? "approval-required" : "manual-required",
      publication: notification.phase === "emitted" ? "published" : "pending",
      unread: true,
      discoveredAt: record.refresh.lastCompletedAt ?? record.refresh.lastAttempt?.completedAt ?? 0,
      ...(notification.disposition === "automatic-applied" ? {
        resolution: { kind: "installed", at: record.refresh.lastCompletedAt ?? record.refresh.lastAttempt?.completedAt ?? 0 },
        automatic: { state: "applied", attemptedAt: record.refresh.lastCompletedAt ?? record.refresh.lastAttempt?.completedAt ?? 0 },
      } : {}),
    })];
  });
  return MarketplaceRegistrationRecordSchema.parse({
    marketplace: record.marketplace,
    source: record.source,
    origin: record.origin,
    ...(record.updateApplication === "automatic" && record.source.kind !== "local-git" ? { applicationOverride: "automatic" } : {}),
    pluginOverrides: [],
    refresh: {
      ...(record.refresh.claim === undefined ? {} : { claim: record.refresh.claim }),
      ...(record.refresh.lastCompletedAt === undefined ? {} : { lastCompletedAt: record.refresh.lastCompletedAt }),
      ...(record.refresh.lastAttempt === undefined ? {} : { lastAttempt: record.refresh.lastAttempt }),
      ...(legacySchedule(record.refresh.nextScheduledAt) === undefined ? {} : { schedule: legacySchedule(record.refresh.nextScheduledAt) }),
      consecutiveFailures: record.refresh.consecutiveFailures,
    },
    notices,
  });
}

export function createMarketplaceConfigurationRecord(input: Readonly<{
  marketplace: MarketplaceName;
  source: MarketplaceSource;
  applicationOverride?: UpdateApplicationOverride;
  /** Compatibility input; automatic maps to an exact marketplace override, manual maps to inherit. */
  updateApplication?: UpdateApplicationPreference;
  refresh?: Partial<MarketplaceRefreshMemory> & Readonly<{ nextScheduledAt?: number }>;
  notices?: readonly UpdateNotice[];
  notifications?: readonly UpdateNotificationMemory[];
  origin?: MarketplaceRegistrationOrigin;
}>): MarketplaceUpdateRecord {
  const source = MarketplaceSourceSchema.parse(input.source);
  const legacyDue = input.refresh?.nextScheduledAt;
  const refreshInput = input.refresh === undefined ? {} : Object.fromEntries(Object.entries(input.refresh).filter(([key]) => key !== "nextScheduledAt"));
  const refresh = MarketplaceRefreshMemorySchema.parse({
    consecutiveFailures: 0,
    ...refreshInput,
    ...(refreshInput.schedule === undefined && legacyDue !== undefined && legacySchedule(legacyDue) !== undefined ? { schedule: legacySchedule(legacyDue) } : {}),
  });
  const requestedOverride = input.applicationOverride ?? (input.updateApplication === "automatic" ? "automatic" : undefined);
  const applicationOverride = source.kind === "local-git" && requestedOverride === "automatic" ? "manual" : requestedOverride;
  const migratedNotices = input.notices ?? (input.notifications === undefined ? [] : migrateMarketplaceRegistrationRecordV3(MarketplaceRegistrationRecordSchemaV3.parse({
    marketplace: input.marketplace,
    source,
    origin: input.origin ?? { kind: "legacy" },
    updateApplication: input.updateApplication ?? "manual",
    refresh: { nextScheduledAt: legacyDue ?? 0, consecutiveFailures: input.refresh?.consecutiveFailures ?? 0 },
    notifications: input.notifications,
  })).notices);
  return MarketplaceRegistrationRecordSchema.parse({
    marketplace: MarketplaceNameSchema.parse(input.marketplace),
    source,
    origin: input.origin ?? { kind: "native" },
    ...(applicationOverride === undefined || applicationOverride === "inherit" ? {} : { applicationOverride }),
    pluginOverrides: [],
    refresh,
    notices: migratedNotices,
  });
}

export function parseMarketplaceUpdateRecord(input: unknown): MarketplaceUpdateRecord {
  const current = MarketplaceRegistrationRecordSchema.safeParse(input);
  if (current.success) return current.data;
  const v3 = MarketplaceRegistrationRecordSchemaV3.safeParse(input);
  if (v3.success) return migrateMarketplaceRegistrationRecordV3(v3.data);
  const v2 = MarketplaceUpdateRecordSchemaV2.safeParse(input);
  if (v2.success) return migrateMarketplaceRegistrationRecordV3(MarketplaceRegistrationRecordSchemaV3.parse({ ...v2.data, origin: { kind: "legacy" } }));
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw current.error;
  const value = input as Record<string, unknown>;
  return createMarketplaceConfigurationRecord({
    marketplace: MarketplaceNameSchema.parse(value.marketplace),
    source: MarketplaceSourceSchema.parse(value.source),
    updateApplication: UpdateApplicationPreferenceSchema.parse(value.updateApplication),
    origin: { kind: "legacy" },
  });
}

export function replaceMarketplaceConfigurationSource(record: MarketplaceUpdateRecord, source: MarketplaceSource): MarketplaceUpdateRecord {
  const nextSource = MarketplaceSourceSchema.parse(source);
  if (canonicalJson(record.source) === canonicalJson(nextSource)) return MarketplaceUpdateRecordSchema.parse(record);
  return createMarketplaceConfigurationRecord({ marketplace: record.marketplace, source: nextSource, origin: record.origin });
}

export function refreshDueAt(record: MarketplaceUpdateRecord): number {
  return record.refresh.schedule?.dueAt ?? 0;
}

export type { ContentDigest, EpochMilliseconds, MarketplaceName, MarketplaceSource, PluginKey, PluginSource, ScopeReference, SourceHash };
