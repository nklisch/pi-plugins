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

export type NodeMarketplaceRefreshServicesOptions = Readonly<{
  refresh: MarketplaceRefreshServiceDependencies;
  delay?: UpdateDelayPort;
}>;

export type NodeMarketplaceRefreshServices = Readonly<{
  refresh: MarketplaceRefreshService;
  policy: MarketplaceUpdatePolicyService;
  scheduler: MarketplaceUpdateScheduler;
}>;

/**
 * Wire the portable refresh loop to Node's abortable timer. No timer, I/O,
 * state read, or host registration occurs until the returned scheduler runs.
 */
export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
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
