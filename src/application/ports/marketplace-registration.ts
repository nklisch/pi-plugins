import type {
  MarketplaceRegistrationRequest,
  MarketplaceRegistrationResult,
} from "../adoption-contract.js";

/** The normal marketplace writer. Adoption cannot bypass catalog identity,
 * portability, trust, state compare-and-commit, or lifecycle policy. */
export interface MarketplaceRegistrationPort {
  register(
    request: MarketplaceRegistrationRequest,
    signal: AbortSignal,
  ): Promise<MarketplaceRegistrationResult>;
}
