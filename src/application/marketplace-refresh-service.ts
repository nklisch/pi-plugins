import { z } from "zod";
import {
  MarketplaceUpdateRecordSchema,
  MarketplaceRefreshMemorySchema,
  deriveMarketplaceSourceIdentity,
  deriveUpdateCandidateKey,
  backoffDelayMs,
  type MarketplaceUpdateRecord,
  type RefreshClaimId,
} from "../domain/update-policy.js";
import { MarketplaceNameSchema, type MarketplaceName } from "../domain/identity.js";
import { GenerationSchema } from "../domain/state/config-state.js";
import { createMarketplaceSnapshotRecord, type MarketplaceSnapshotRecord } from "../domain/state/installed-state.js";
import { ScopeContextSchema, toScopeReference, type ScopeContext } from "../domain/state/scope.js";
import { createPromotionPlan } from "./content-promotion.js";
import type { GenerationMutationCoordinator } from "./generation-mutation-coordinator.js";
import type { MarketplaceInspectionService } from "./marketplace-inspection-contract.js";
import type { ContentStorePort } from "./ports/content-store.js";
import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { LifecycleStateInventoryPort } from "./ports/lifecycle-state-inventory.js";
import type { LifecycleStateStore } from "./ports/lifecycle-state-store.js";
import type { MarketplaceMaterializer, MaterializedMarketplace, PluginMaterializer } from "./source-materialization.js";
import { parseStateMutation, type GenerationSnapshot } from "./state-contract.js";
import {
  MarketplaceRefreshRequestSchema,
  MarketplaceRefreshResultSchema,
  MarketplaceReadResultSchema,
  PluginUpdateOutcomeSchema,
  type MarketplaceRefreshRequest,
  type MarketplaceRefreshResult,
  type MarketplaceRefreshOutcome,
  type PluginUpdateOutcome,
  type NotificationIntent,
} from "./update-contract.js";
import type { Sha256 } from "../domain/source.js";
import type { RefreshClaimIdPort } from "./ports/refresh-claim-id.js";

export const DefaultMarketplaceUpdatePolicy = Object.freeze({
  successIntervalMs: 6 * 60 * 60 * 1_000,
  failureBaseMs: 5 * 60 * 1_000,
  failureMaxMs: 6 * 60 * 60 * 1_000,
  claimLeaseMs: 15 * 60 * 1_000,
  inventoryPollMs: 15 * 60 * 1_000,
});

export type MarketplacePluginProbeResult = Readonly<{
  plugin: import("../domain/identity.js").PluginKey;
  entry: import("../domain/marketplace.js").NormalizedMarketplaceEntry;
  available: import("../domain/update-policy.js").AvailableRevision;
  candidate: import("../domain/update-policy.js").UpdateCandidateKey;
  display: Readonly<{ installed: string; available: string }>;
}>;

export type MarketplacePluginProbePort = (input: Readonly<{
  scope: ScopeContext;
  record: MarketplaceUpdateRecord;
  snapshot: MarketplaceSnapshotRecord;
  catalog: import("../domain/marketplace.js").MarketplaceReadResult;
  signal: AbortSignal;
}>) => Promise<readonly MarketplacePluginProbeResult[]>;

function abortIfRequested(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new DOMException("The operation was aborted", "AbortError");
}

function scopeSort(left: ScopeContext, right: ScopeContext): number {
  if (left.kind !== right.kind) return left.kind === "user" ? -1 : 1;
  if (left.kind === "user" || right.kind === "user") return 0;
  return left.projectKey.localeCompare(right.projectKey);
}

function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => MarketplaceUpdateRecordSchema.parse(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => MarketplaceUpdateRecordSchema.parse(record));
}

function recordFor(snapshot: GenerationSnapshot, marketplace: MarketplaceName): MarketplaceUpdateRecord | undefined {
  return recordsFor(snapshot).find((record) => record.marketplace === marketplace);
}

function replaceRecord(snapshot: GenerationSnapshot, marketplace: MarketplaceName, replacement: MarketplaceUpdateRecord, sha256: Sha256): ReturnType<typeof parseStateMutation> {
  const records = recordsFor(snapshot).map((record) => record.marketplace === marketplace ? replacement : record);
  if ("config" in snapshot) {
    const config = { ...snapshot.config, schemaVersion: 2 as const, generation: snapshot.generation, records };
    return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
  }
  const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);
}

function outcomeFailed(marketplace: MarketplaceName, code: string): MarketplaceRefreshOutcome {
  return MarketplaceReadResultSchema.parse({ kind: "failed", marketplace, code });
}

function claimIsActive(record: MarketplaceUpdateRecord, now: number): boolean {
  return record.refresh.claim !== undefined && record.refresh.claim.expiresAt > now;
}

function shouldRateLimit(record: MarketplaceUpdateRecord, now: number): boolean {
  return record.refresh.nextScheduledAt > now;
}

function nextRefreshTime(record: MarketplaceUpdateRecord, now: number): number {
  if (record.refresh.nextScheduledAt > now) return record.refresh.nextScheduledAt;
  return now;
}

function failureRecord(record: MarketplaceUpdateRecord, now: number): MarketplaceUpdateRecord {
  const failures = record.refresh.consecutiveFailures + 1;
  const delay = backoffDelayMs(failures, DefaultMarketplaceUpdatePolicy.failureBaseMs, DefaultMarketplaceUpdatePolicy.failureMaxMs);
  return MarketplaceUpdateRecordSchema.parse({
    ...record,
    refresh: {
      ...record.refresh,
      claim: undefined,
      consecutiveFailures: failures,
      nextScheduledAt: now + delay,
    },
  });
}

function successRecord(record: MarketplaceUpdateRecord, now: number, claim: RefreshClaimId): MarketplaceUpdateRecord {
  return MarketplaceUpdateRecordSchema.parse({
    ...record,
    refresh: {
      lastCompletedAt: now,
      nextScheduledAt: now + DefaultMarketplaceUpdatePolicy.successIntervalMs,
      consecutiveFailures: 0,
      claim: undefined,
    },
    // The winning claim is checked before this replacement; retaining no claim
    // after publication prevents a completed fetch from blocking later work.
    _claimProof: undefined,
    notifications: record.notifications,
  });
}

function candidateNotifications(
  record: MarketplaceUpdateRecord,
  scope: ScopeContext,
  probes: readonly MarketplacePluginProbeResult[],
): Readonly<{ record: MarketplaceUpdateRecord; outcomes: readonly PluginUpdateOutcome[]; intents: readonly NotificationIntent[] }> {
  const notifications = [...record.notifications];
  const outcomes: PluginUpdateOutcome[] = [];
  const intents: NotificationIntent[] = [];
  for (const probe of probes) {
    const parsed = PluginUpdateOutcomeSchema.parse({
      plugin: probe.plugin,
      disposition: "discovered",
      candidate: probe.candidate,
      available: probe.available,
    });
    outcomes.push(parsed);
    const index = notifications.findIndex((notification) => notification.plugin === probe.plugin && notification.scope.kind === scope.kind && (scope.kind === "user" || notification.scope.kind === "project" && notification.scope.projectKey === scope.projectKey));
    const previous = index < 0 ? undefined : notifications[index];
    if (previous?.candidate === probe.candidate) continue;
    const next = {
      scope: toScopeReference(scope),
      plugin: probe.plugin,
      candidate: probe.candidate,
      available: probe.available,
      display: probe.display,
      phase: "discovered" as const,
    };
    if (index < 0) notifications.push(next);
    else notifications[index] = next;
  }
  return { record: MarketplaceUpdateRecordSchema.parse({ ...record, notifications }), outcomes, intents };
}

export interface MarketplaceRefreshService {
  refresh(request: MarketplaceRefreshRequest, signal: AbortSignal): Promise<MarketplaceRefreshResult>;
  nextScheduledAt(signal: AbortSignal): Promise<number | undefined>;
}

export type MarketplaceRefreshServiceDependencies = Readonly<{
  inventory: LifecycleStateInventoryPort;
  state: LifecycleStateStore;
  mutations: GenerationMutationCoordinator;
  clock: LifecycleClock;
  claimIds: RefreshClaimIdPort;
  materializers: Readonly<{ marketplaces: MarketplaceMaterializer; plugins?: PluginMaterializer }>;
  inspection: MarketplaceInspectionService;
  content: ContentStorePort;
  sha256: Sha256;
  probe?: MarketplacePluginProbePort;
}>;

export function createMarketplaceRefreshService(dependencies: MarketplaceRefreshServiceDependencies): MarketplaceRefreshService {
  if (typeof dependencies.sha256 !== "function") throw new TypeError("marketplace refresh requires SHA-256");
  const now = () => dependencies.clock.nowEpochMilliseconds();

  async function mutateRecord(
    scope: ScopeContext,
    marketplace: MarketplaceName,
    expected: GenerationSnapshot,
    next: MarketplaceUpdateRecord,
    signal: AbortSignal,
  ): Promise<"committed" | "stale"> {
    const result = await dependencies.mutations.runPreparedMutation(
      { scope, plugins: [], expectedGeneration: expected.generation },
      async (context) => {
        const current = recordFor(context.snapshot, marketplace);
        if (current === undefined || deriveMarketplaceSourceIdentity(current.source, dependencies.sha256) !== deriveMarketplaceSourceIdentity(next.source, dependencies.sha256)) throw new Error("SOURCE_CHANGED");
        return { mutation: replaceRecord(context.snapshot, marketplace, next, dependencies.sha256), value: undefined };
      },
      signal,
    );
    return result.kind === "committed" ? "committed" : "stale";
  }

  async function refreshOne(scope: ScopeContext, marketplace: MarketplaceName, trigger: "explicit" | "scheduled", signal: AbortSignal): Promise<Readonly<{ outcome: MarketplaceRefreshOutcome; notifications: readonly NotificationIntent[] }>> {
    abortIfRequested(signal);
    const loaded = await dependencies.state.read(scope, signal);
    if (!loaded.ok) return { outcome: outcomeFailed(marketplace, "STATE_CORRUPT"), notifications: [] };
    const initialRecord = recordFor(loaded.snapshot, marketplace);
    if (initialRecord === undefined) return { outcome: outcomeFailed(marketplace, "STATE_STALE"), notifications: [] };
    const current = MarketplaceUpdateRecordSchema.parse(initialRecord);
    const time = now();
    if (trigger === "scheduled" && current.source.kind === "local-git") return { outcome: MarketplaceReadResultSchema.parse({ kind: "skipped-local", marketplace, trigger }), notifications: [] };
    if (claimIsActive(current, time)) return { outcome: MarketplaceReadResultSchema.parse({ kind: "coalesced", marketplace, claimExpiresAt: current.refresh.claim!.expiresAt }), notifications: [] };
    if (trigger === "scheduled" && shouldRateLimit(current, time)) return { outcome: MarketplaceReadResultSchema.parse({ kind: "rate-limited", marketplace, nextAt: nextRefreshTime(current, time) }), notifications: [] };

    const id = await dependencies.claimIds.create();
    const claim = { id, startedAt: time, expiresAt: time + DefaultMarketplaceUpdatePolicy.claimLeaseMs };
    const claimed = MarketplaceUpdateRecordSchema.parse({ ...current, refresh: { ...current.refresh, claim } });
    try {
      if (await mutateRecord(scope, marketplace, loaded.snapshot, claimed, signal) !== "committed") return { outcome: outcomeFailed(marketplace, "STATE_STALE"), notifications: [] };
    } catch (error) {
      if (error instanceof Error && error.message === "SOURCE_CHANGED") return { outcome: outcomeFailed(marketplace, "STATE_STALE"), notifications: [] };
      throw error;
    }

    let allocation: Awaited<ReturnType<ContentStorePort["allocateStaging"]>> | undefined;
    try {
      allocation = await dependencies.content.allocateStaging(signal);
      const materialized: MaterializedMarketplace = await dependencies.materializers.marketplaces.materialize(current.source, allocation.slot, signal);
      const catalog = await dependencies.inspection.inspect(materialized, signal);
      const snapshot = createMarketplaceSnapshotRecord({ marketplace, source: materialized.source, content: materialized.content, binding: materialized.binding }, dependencies.sha256);
      const probes = dependencies.probe === undefined ? [] : await dependencies.probe({ scope, record: claimed, snapshot, catalog, signal });
      const discovered = candidateNotifications(claimed, scope, probes);
      const published = MarketplaceUpdateRecordSchema.parse({ ...discovered.record, refresh: { lastCompletedAt: now(), nextScheduledAt: now() + DefaultMarketplaceUpdatePolicy.successIntervalMs, consecutiveFailures: 0 } });
      const latest = await dependencies.state.read(scope, signal);
      if (!latest.ok) throw new Error("STATE_STALE");
      const plan = createPromotionPlan({ kind: "marketplace", allocation, materialized }, dependencies.sha256);
      const publishResult = await dependencies.mutations.runPreparedMutation(
        { scope, plugins: [], expectedGeneration: latest.snapshot.generation },
        async (context) => {
          const record = recordFor(context.snapshot, marketplace);
          if (record === undefined || record.refresh.claim?.id !== id || deriveMarketplaceSourceIdentity(record.source, dependencies.sha256) !== deriveMarketplaceSourceIdentity(current.source, dependencies.sha256)) throw new Error("STATE_STALE");
          const promoted = await dependencies.content.promote(plan, signal);
          if (promoted.identity.kind !== "marketplace") throw new Error("PROMOTION_FAILED");
          return { mutation: replaceRecord(context.snapshot, marketplace, published, dependencies.sha256), value: undefined };
        },
        signal,
      );
      if (publishResult.kind !== "committed") throw new Error("STATE_STALE");
      return {
        outcome: MarketplaceReadResultSchema.parse({ kind: "refreshed", marketplace, snapshot, plugins: discovered.outcomes }),
        notifications: discovered.intents,
      };
    } catch (error) {
      if (signal.aborted) return { outcome: outcomeFailed(marketplace, "ABORTED"), notifications: [] };
      const latest = await dependencies.state.read(scope, signal).catch(() => undefined);
      if (latest?.ok) {
        const record = recordFor(latest.snapshot, marketplace);
        if (record !== undefined) {
          try { await mutateRecord(scope, marketplace, latest.snapshot, failureRecord(record, now()), signal); } catch { /* retain active state if failure memory cannot commit */ }
        }
      }
      return { outcome: outcomeFailed(marketplace, error instanceof Error && error.message === "PROMOTION_FAILED" ? "PROMOTION_FAILED" : error instanceof Error && error.message === "STATE_STALE" ? "STATE_STALE" : "SOURCE_FAILED"), notifications: [] };
    } finally {
      if (allocation !== undefined) {
        try { await dependencies.content.discardStaging(allocation, new AbortController().signal); } catch { /* inert staging is recovery/GC input */ }
      }
    }
  }

  return {
    async refresh(request, signal) {
      const parsed = MarketplaceRefreshRequestSchema.parse(request);
      const discovered = await dependencies.inventory.discover(signal);
      const scopes = discovered.scopes.map((scope) => ScopeContextSchema.parse(scope)).sort(scopeSort);
      const jobs: Array<{ scope: ScopeContext; marketplace: MarketplaceName }> = [];
      for (const scope of scopes) {
        const loaded = await dependencies.state.read(scope, signal);
        if (!loaded.ok) continue;
        for (const record of [...recordsFor(loaded.snapshot)].sort((a, b) => a.marketplace.localeCompare(b.marketplace))) {
          if (parsed.marketplace !== undefined && record.marketplace !== parsed.marketplace) continue;
          jobs.push({ scope, marketplace: record.marketplace });
        }
      }
      const outcomes: MarketplaceRefreshOutcome[] = [];
      const notifications: NotificationIntent[] = [];
      for (const job of jobs) {
        const result = await refreshOne(job.scope, job.marketplace, parsed.trigger, signal);
        outcomes.push(result.outcome);
        notifications.push(...result.notifications);
      }
      return MarketplaceRefreshResultSchema.parse({ outcomes, notifications });
    },
    async nextScheduledAt(signal) {
      const inventory = await dependencies.inventory.discover(signal);
      let earliest: number | undefined;
      for (const scope of inventory.scopes.map((value) => ScopeContextSchema.parse(value))) {
        const loaded = await dependencies.state.read(scope, signal);
        if (!loaded.ok) continue;
        for (const record of recordsFor(loaded.snapshot)) {
          if (record.source.kind === "local-git") continue;
          const at = record.refresh.nextScheduledAt;
          if (earliest === undefined || at < earliest) earliest = at;
        }
      }
      return earliest;
    },
  };
}
