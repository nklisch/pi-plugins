import { z } from "zod";
import { deriveMarketplaceSourceIdentity, MarketplaceUpdateRecordSchema, UpdateApplicationPreferenceSchema, type MarketplaceUpdateRecord, type UpdateApplicationPreference, type SourceHash } from "../domain/update-policy.js";
import { MarketplaceNameSchema, type MarketplaceName } from "../domain/identity.js";
import { ScopeContextSchema, type ScopeContext } from "../domain/state/scope.js";
import { parseStateMutation, type GenerationSnapshot } from "./state-contract.js";
import type { GenerationMutationCoordinator } from "./generation-mutation-coordinator.js";
import type { LifecycleStateStore } from "./ports/lifecycle-state-store.js";
import type { Sha256 } from "../domain/source.js";

export const MarketplaceUpdatePreferenceResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["changed", "unchanged"]), preference: UpdateApplicationPreferenceSchema }).strict().readonly(),
  z.object({ kind: z.literal("rejected"), code: z.enum(["NOT_CONFIGURED", "SOURCE_CHANGED", "LOCAL_AUTOMATIC_FORBIDDEN", "STATE_STALE"]) }).strict().readonly(),
]);
export type MarketplaceUpdatePreferenceResult = z.infer<typeof MarketplaceUpdatePreferenceResultSchema>;

function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => MarketplaceUpdateRecordSchema.parse(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => MarketplaceUpdateRecordSchema.parse(record));
}

function replaceSnapshot(snapshot: GenerationSnapshot, records: readonly MarketplaceUpdateRecord[], sha256: Sha256): ReturnType<typeof parseStateMutation> {
  if ("config" in snapshot) {
    const config = { ...snapshot.config, generation: snapshot.generation, records };
    return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
  }
  const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);
}

export interface MarketplaceUpdatePolicyService {
  setApplicationPreference(request: Readonly<{
    scope: ScopeContext;
    marketplace: MarketplaceName;
    sourceIdentity: SourceHash;
    preference: UpdateApplicationPreference;
  }>, signal: AbortSignal): Promise<MarketplaceUpdatePreferenceResult>;
}

export function createMarketplaceUpdatePolicyService(dependencies: Readonly<{
  state: LifecycleStateStore;
  mutations: GenerationMutationCoordinator;
  sha256: Sha256;
}>): MarketplaceUpdatePolicyService {
  if (typeof dependencies.sha256 !== "function") throw new TypeError("update policy requires SHA-256");
  return {
    async setApplicationPreference(request, signal) {
      const scope = ScopeContextSchema.parse(request.scope);
      const marketplace = MarketplaceNameSchema.parse(request.marketplace);
      const sourceIdentity = z.string().regex(/^sha256:[0-9a-f]{64}$/).parse(request.sourceIdentity) as SourceHash;
      const preference = UpdateApplicationPreferenceSchema.parse(request.preference);
      const loaded = await dependencies.state.read(scope, signal);
      if (!loaded.ok) return { kind: "rejected", code: "STATE_STALE" };
      const record = recordsFor(loaded.snapshot).find((candidate) => candidate.marketplace === marketplace);
      if (record === undefined) return { kind: "rejected", code: "NOT_CONFIGURED" };
      if (deriveMarketplaceSourceIdentity(record.source, dependencies.sha256) !== sourceIdentity) return { kind: "rejected", code: "SOURCE_CHANGED" };
      if (record.source.kind === "local-git" && preference === "automatic") return { kind: "rejected", code: "LOCAL_AUTOMATIC_FORBIDDEN" };
      if (record.updateApplication === preference) return { kind: "unchanged", preference };

      try {
        const result = await dependencies.mutations.runPreparedMutation(
          { scope, plugins: [], expectedGeneration: loaded.snapshot.generation },
          async (context) => {
            const current = recordsFor(context.snapshot).find((candidate) => candidate.marketplace === marketplace);
            if (current === undefined) throw new Error("NOT_CONFIGURED");
            if (deriveMarketplaceSourceIdentity(current.source, dependencies.sha256) !== sourceIdentity) throw new Error("SOURCE_CHANGED");
            const next = MarketplaceUpdateRecordSchema.parse({ ...current, updateApplication: preference });
            const records = recordsFor(context.snapshot).map((candidate) => candidate.marketplace === marketplace ? next : candidate);
            return { mutation: replaceSnapshot(context.snapshot, records, dependencies.sha256), value: preference };
          },
          signal,
        );
        if (result.kind === "committed") return { kind: "changed", preference };
        return { kind: "rejected", code: "STATE_STALE" };
      } catch (error) {
        if (error instanceof Error && error.message === "SOURCE_CHANGED") return { kind: "rejected", code: "SOURCE_CHANGED" };
        if (error instanceof Error && error.message === "NOT_CONFIGURED") return { kind: "rejected", code: "NOT_CONFIGURED" };
        if (signal.aborted) throw signal.reason;
        return { kind: "rejected", code: "STATE_STALE" };
      }
    },
  };
}
