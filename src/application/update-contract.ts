import { z } from "zod";
import { MarketplaceNameSchema, PluginKeySchema, type MarketplaceName, type PluginKey } from "../domain/identity.js";
import { MarketplaceReadResultSchema as DomainMarketplaceReadResultSchema, type MarketplaceReadResult, type NormalizedMarketplaceEntry } from "../domain/marketplace.js";
import { ContentDigestSchema, type ContentDigest } from "../domain/content-manifest.js";
import { ScopeContextSchema, ScopeReferenceSchema, type ScopeContext, type ScopeReference } from "../domain/state/scope.js";
import { MarketplaceSnapshotRecordSchema, type MarketplaceSnapshotRecord } from "../domain/state/installed-state.js";
import {
  AvailableRevisionSchema,
  MarketplaceUpdateRecordSchema,
  UpdateCandidateKeySchema,
  type AvailableRevision,
  type MarketplaceUpdateRecord,
  type UpdateCandidateKey,
} from "../domain/update-policy.js";
import { EpochMillisecondsSchema, type EpochMilliseconds } from "../domain/time.js";

export const MarketplaceRefreshRequestSchema = z.object({
  trigger: z.enum(["explicit", "scheduled"]),
  marketplace: MarketplaceNameSchema.optional(),
}).strict().readonly();
export type MarketplaceRefreshRequest = z.infer<typeof MarketplaceRefreshRequestSchema>;

export const UpdateDispositionSchema = z.enum([
  "current", "discovered", "manual-required", "approval-required",
  "automatic-applied", "automatic-retryable", "recovery-required",
  "failed",
]);
export type UpdateDisposition = z.infer<typeof UpdateDispositionSchema>;

export const NotificationIntentSchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  candidate: UpdateCandidateKeySchema,
  installed: z.string().min(1),
  available: z.string().min(1),
  disposition: UpdateDispositionSchema,
}).strict().readonly();
export type NotificationIntent = z.infer<typeof NotificationIntentSchema>;

export const PluginUpdateOutcomeSchema = z.object({
  plugin: PluginKeySchema,
  disposition: UpdateDispositionSchema,
  candidate: UpdateCandidateKeySchema.optional(),
  available: AvailableRevisionSchema.optional(),
  notification: z.enum(["new", "already-emitted", "none"]).optional(),
}).strict().readonly();
export type PluginUpdateOutcome = z.infer<typeof PluginUpdateOutcomeSchema>;

export const MarketplaceReadResultSchema = z.object({
  kind: z.enum(["refreshed", "rate-limited", "coalesced", "skipped-local", "failed"]),
  marketplace: MarketplaceNameSchema,
  snapshot: MarketplaceSnapshotRecordSchema.optional(),
  plugins: z.array(PluginUpdateOutcomeSchema).readonly().optional(),
  nextAt: EpochMillisecondsSchema.optional(),
  claimExpiresAt: EpochMillisecondsSchema.optional(),
  trigger: z.enum(["scheduled"]).optional(),
  code: z.string().min(1).optional(),
}).strict().readonly();
export type MarketplaceRefreshOutcome = z.infer<typeof MarketplaceReadResultSchema>;

export const MarketplaceRefreshResultSchema = z.object({
  outcomes: z.array(MarketplaceReadResultSchema).readonly(),
  notifications: z.array(NotificationIntentSchema).readonly(),
}).strict().readonly();
export type MarketplaceRefreshResult = z.infer<typeof MarketplaceRefreshResultSchema>;

export type MarketplacePluginProbe = Readonly<{
  plugin: PluginKey;
  entry: NormalizedMarketplaceEntry;
  available: AvailableRevision;
  candidate: UpdateCandidateKey;
  display: Readonly<{ installed: string; available: string }>;
}>;

export type MarketplaceSnapshotRead = Readonly<{
  snapshot: MarketplaceSnapshotRecord;
  catalog: MarketplaceReadResult;
  record: MarketplaceUpdateRecord;
}>;

export { AvailableRevisionSchema, MarketplaceUpdateRecordSchema, DomainMarketplaceReadResultSchema, MarketplaceRefreshRequestSchema as RefreshRequestSchema };
export type { AvailableRevision, ContentDigest, EpochMilliseconds, MarketplaceName, MarketplaceReadResult, MarketplaceSnapshotRecord, PluginKey, ScopeContext, ScopeReference, UpdateCandidateKey };
