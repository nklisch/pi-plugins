import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { UpdateDelayPort } from "./ports/update-delay.js";
import type { MarketplaceRefreshService } from "./marketplace-refresh-service.js";

const DEFAULT_INVENTORY_POLL_MS = 15 * 60 * 1_000;

export type MarketplaceUpdateSchedulerDependencies = Readonly<{
  refresh: MarketplaceRefreshService;
  clock: LifecycleClock;
  delay: UpdateDelayPort;
  inventoryPollMs?: number;
}>;

export interface MarketplaceUpdateScheduler {
  /** Run until the caller aborts. Construction never starts this loop. */
  run(signal: AbortSignal): Promise<void>;
}

function positiveMilliseconds(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive safe integer`);
  return value;
}

export function createMarketplaceUpdateScheduler(
  dependencies: MarketplaceUpdateSchedulerDependencies,
): MarketplaceUpdateScheduler {
  if (dependencies === null || typeof dependencies !== "object") throw new TypeError("scheduler dependencies are required");
  if (dependencies.refresh === undefined || dependencies.clock === undefined || dependencies.delay === undefined) {
    throw new TypeError("scheduler requires refresh, clock, and delay dependencies");
  }
  const inventoryPollMs = positiveMilliseconds(dependencies.inventoryPollMs ?? DEFAULT_INVENTORY_POLL_MS, "inventoryPollMs");

  return Object.freeze({
    async run(signal: AbortSignal): Promise<void> {
      if (signal === null || typeof signal !== "object") throw new TypeError("scheduler signal is required");
      for (;;) {
        signal.throwIfAborted();
        await dependencies.refresh.refresh({ trigger: "scheduled" }, signal);
        signal.throwIfAborted();

        const scheduledAt = await dependencies.refresh.nextScheduledAt(signal);
        const now = dependencies.clock.nowEpochMilliseconds();
        const untilDue = scheduledAt === undefined ? inventoryPollMs : Math.max(0, scheduledAt - now);
        await dependencies.delay.wait(Math.min(inventoryPollMs, untilDue), signal);
      }
    },
  });
}

export { DEFAULT_INVENTORY_POLL_MS };
