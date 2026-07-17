import type { ResolvedMarketplaceCandidate } from "../marketplace-catalog-service.js";
import type { ContentStorePort, StagingAllocation } from "./content-store.js";
import type { MaterializedPlugin } from "../source-materialization.js";

declare const candidateContentLeaseBrand: unique symbol;

/** Ownership transferred to lifecycle; its transaction now owns allocation cleanup. */
export type ClaimedCandidateContent = Readonly<{
  candidate: ResolvedMarketplaceCandidate;
  materialized: MaterializedPlugin;
  allocation: StagingAllocation;
}>;

export interface CandidateContentLease {
  readonly [candidateContentLeaseBrand]: true;
  readonly candidate: ResolvedMarketplaceCandidate;
  readonly materialized: MaterializedPlugin;
  claim(signal: AbortSignal): Promise<ClaimedCandidateContent>;
  release(): Promise<void>;
}

export interface CandidateContentLeasePort {
  acquire(candidate: ResolvedMarketplaceCandidate, signal: AbortSignal): Promise<CandidateContentLease>;
  withMaterialized<T>(
    candidate: ResolvedMarketplaceCandidate,
    signal: AbortSignal,
    use: (materialized: MaterializedPlugin) => Promise<T>,
  ): Promise<T>;
}

/** Composition-only dependencies named here to keep lease behavior adapter-neutral. */
export type CandidateContentLeaseAdapterDependencies = Readonly<{
  content: Pick<ContentStorePort, "allocateStaging" | "discardStaging">;
  materializer: import("../source-materialization.js").PluginMaterializer;
}>;
