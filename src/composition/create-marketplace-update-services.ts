import {
  createNodeMarketplaceRefreshServices,
  type NodeMarketplaceRefreshServicesOptions,
  type NodeMarketplaceRefreshServices,
} from "./create-marketplace-refresh-services.js";

/**
 * Node composition name for the complete update surface. The refresh-named
 * factory remains as a compatibility alias for existing hosts; both factories
 * return the same explicit policy, refresh, and scheduler services.
 */
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceRefreshServices(options);
}

export type {
  NodeMarketplaceRefreshServicesOptions as NodeMarketplaceUpdateServicesOptions,
  NodeMarketplaceRefreshServices as NodeMarketplaceUpdateServices,
};
