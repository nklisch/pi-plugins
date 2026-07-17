import type { ResolvedMarketplaceCandidate } from "../marketplace-catalog-service.js";
import type { MaterializedPlugin } from "../source-materialization.js";

/** Callback-scoped scratch content. Materialized roots never escape `use`. */
export interface InspectionCandidateContentPort {
  withMaterialized<T>(
    candidate: ResolvedMarketplaceCandidate,
    signal: AbortSignal,
    use: (materialized: MaterializedPlugin) => Promise<T>,
  ): Promise<T>;
}
