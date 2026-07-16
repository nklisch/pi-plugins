import { setTimeout as nodeSetTimeout } from "node:timers/promises";
import {
  createMarketplaceRefreshService,
  type MarketplaceRefreshService,
  type MarketplaceRefreshServiceDependencies,
} from "../application/marketplace-refresh-service.js";
import {
  createMarketplaceUpdateScheduler,
  type MarketplaceUpdateScheduler,
} from "../application/marketplace-update-scheduler.js";
import type { UpdateDelayPort } from "../application/ports/update-delay.js";
import {
  createMarketplaceUpdatePolicyService,
  type MarketplaceUpdatePolicyService,
} from "../application/marketplace-update-policy-service.js";

const nodeDelay: UpdateDelayPort = Object.freeze({
  async wait(milliseconds: number, signal: AbortSignal) {
    await nodeSetTimeout(milliseconds, undefined, { signal });
  },
});

export type NodeMarketplaceUpdateServicesOptions = Readonly<{
  refresh: MarketplaceRefreshServiceDependencies;
  delay?: UpdateDelayPort;
}>;

export type NodeMarketplaceUpdateServices = Readonly<{
  refresh: MarketplaceRefreshService;
  policy: MarketplaceUpdatePolicyService;
  scheduler: MarketplaceUpdateScheduler;
}>;

/**
 * Wire the complete portable marketplace update surface to Node's abortable
 * timer. Construction performs no I/O and starts no work.
 */
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceUpdateServicesOptions,
): NodeMarketplaceUpdateServices {
  if (options === null || typeof options !== "object" || options.refresh === undefined) {
    throw new TypeError("marketplace refresh composition requires refresh dependencies");
  }
  const refresh = createMarketplaceRefreshService(options.refresh);
  const policy = createMarketplaceUpdatePolicyService({
    state: options.refresh.state,
    mutations: options.refresh.mutations,
    sha256: options.refresh.sha256,
  });
  const scheduler = createMarketplaceUpdateScheduler({
    refresh,
    clock: options.refresh.clock,
    delay: options.delay ?? nodeDelay,
  });
  return Object.freeze({ refresh, policy, scheduler });
}
