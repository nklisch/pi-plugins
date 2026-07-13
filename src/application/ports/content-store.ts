import type {
  ContentStoreIdentity,
} from "../../domain/content-store.js";
import type {
  ContentDigest,
  ContentManifest,
} from "../../domain/content-manifest.js";
import type {
  InstalledRevisionRecord,
  MarketplaceSnapshotRecord,
} from "../../domain/state/installed-state.js";
import type {
  PluginKey,
} from "../../domain/identity.js";
import type {
  MarketplaceContentRef,
  PluginContentRef,
  PluginDataRef,
  ProjectionRootRef,
} from "../../domain/state/references.js";
import type { ScopeReference } from "../../domain/state/scope.js";
import type { StagingSlot } from "./source-acquisition.js";
import type {
  ResolvedMarketplaceSource,
  ResolvedPluginSource,
} from "../../domain/source.js";

/** Capabilities required before this port may report a successful promotion. */
export type ContentStoreCapabilities = Readonly<{
  atomicNoReplaceDirectory: true;
  fileSync: true;
  directorySync: true;
  readOnlyModeEnforcement: "posix-mode";
}>;

/**
 * A staging allocation is an adapter-issued capability. `allocationId` is
 * intentionally present only for the opaque implementation token; callers must
 * never serialize, display, or derive paths from it.
 */
export type StagingAllocation = Readonly<{
  slot: StagingSlot;
  allocationId: string;
}>;

export type PromotionResult = Readonly<{
  kind: "promoted" | "already-present";
  identity: ContentStoreIdentity;
  /** Ephemeral runtime path; it must never be persisted in state. */
  root: string;
  manifest: ContentManifest;
}>;

export type ResolvedContentRoot = Readonly<{
  kind: "marketplace" | "plugin";
  root: string;
  identity: ContentStoreIdentity;
  manifest: ContentManifest;
  contentRef: MarketplaceContentRef | PluginContentRef;
}>;

export type StableDataRootRequest = Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  dataRef: PluginDataRef;
}>;

export type WritableDataRoot = Readonly<{
  root: string;
  scope: ScopeReference;
  plugin: PluginKey;
  dataRef: PluginDataRef;
}>;

export type ProjectionRootRequest = Readonly<{
  scope: ScopeReference;
  plugin: PluginKey;
  projectionDigest: ContentDigest;
  projectionRef: ProjectionRootRef;
}>;

export type ProjectionRootAllocation = Readonly<{
  root: string;
  scope: ScopeReference;
  plugin: PluginKey;
  projectionDigest: ContentDigest;
  projectionRef: ProjectionRootRef;
  allocationId: string;
}>;

export type ResolvedProjectionRoot = Readonly<{
  root: string;
  scope: ScopeReference;
  plugin: PluginKey;
  projectionDigest: ContentDigest;
  projectionRef: ProjectionRootRef;
}>;

export type VerifiedPromotionPlan = Readonly<{
  kind: "marketplace" | "plugin";
  allocation: StagingAllocation;
  root: string;
  source: ResolvedMarketplaceSource | ResolvedPluginSource;
  manifest: ContentManifest;
  binding: ContentDigest;
  identity: ContentStoreIdentity;
}>;

/** The only lifecycle-facing physical-content capability. */
export interface ContentStorePort {
  capabilities(signal: AbortSignal): Promise<ContentStoreCapabilities>;
  allocateStaging(signal: AbortSignal): Promise<StagingAllocation>;
  discardStaging(allocation: StagingAllocation, signal: AbortSignal): Promise<void>;
  promote(plan: VerifiedPromotionPlan, signal: AbortSignal): Promise<PromotionResult>;
  resolveMarketplace(record: MarketplaceSnapshotRecord, signal: AbortSignal): Promise<ResolvedContentRoot>;
  resolvePlugin(record: InstalledRevisionRecord, signal: AbortSignal): Promise<ResolvedContentRoot>;
  ensureDataRoot(input: StableDataRootRequest, signal: AbortSignal): Promise<WritableDataRoot>;
  allocateProjectionRoot(input: ProjectionRootRequest, signal: AbortSignal): Promise<ProjectionRootAllocation>;
  sealProjectionRoot(input: ProjectionRootAllocation, signal: AbortSignal): Promise<ResolvedProjectionRoot>;
}
