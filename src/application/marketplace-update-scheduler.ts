import type { ScopeReference } from "../domain/state/scope.js";
import type { UpdateSchedulerLeaseId } from "../domain/update-policy.js";
import type { LifecycleClock } from "./ports/lifecycle-clock.js";
import type { UpdateDelayPort } from "./ports/update-delay.js";
import type { UpdateSchedulerLeasePort } from "./ports/update-scheduler-lease.js";
import type { UpdateSchedulerLeaseIdPort } from "./ports/update-scheduler-lease-id.js";
import type { MarketplaceRefreshService } from "./marketplace-refresh-service.js";

const DEFAULT_INVENTORY_POLL_MS = 30_000;
const DEFAULT_LEASE_MS = 2 * 60_000;

export type UpdateSchedulerStatus = Readonly<{
  state: "disabled" | "standby" | "running" | "clock-regressed" | "degraded" | "stopped";
  scopes: readonly Readonly<{ scope: ScopeReference; ownership: "self" | "other" | "none"; nextAt?: number }>[];
}>;

export type MarketplaceUpdateSchedulerDependencies = Readonly<{
  refresh: MarketplaceRefreshService;
  clock: LifecycleClock;
  delay: UpdateDelayPort;
  leases?: UpdateSchedulerLeasePort;
  leaseIds?: UpdateSchedulerLeaseIdPort;
  inventoryPollMs?: number;
  leaseMs?: number;
}>;

export interface MarketplaceUpdateScheduler {
  /** Run until the caller aborts. Construction never starts this loop. */
  run(signal: AbortSignal): Promise<void>;
  status(signal: AbortSignal): Promise<UpdateSchedulerStatus>;
}

function positiveMilliseconds(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive safe integer`);
  return value;
}

export function createMarketplaceUpdateScheduler(dependencies: MarketplaceUpdateSchedulerDependencies): MarketplaceUpdateScheduler {
  if (dependencies === null || typeof dependencies !== "object") throw new TypeError("scheduler dependencies are required");
  if (dependencies.refresh === undefined || dependencies.clock === undefined || dependencies.delay === undefined) throw new TypeError("scheduler requires refresh, clock, and delay dependencies");
  if ((dependencies.leases === undefined) !== (dependencies.leaseIds === undefined)) throw new TypeError("scheduler lease state and identifier authority must be configured together");
  const inventoryPollMs = positiveMilliseconds(dependencies.inventoryPollMs ?? DEFAULT_INVENTORY_POLL_MS, "inventoryPollMs");
  const leaseMs = positiveMilliseconds(dependencies.leaseMs ?? DEFAULT_LEASE_MS, "leaseMs");
  if (dependencies.leases !== undefined && leaseMs <= inventoryPollMs) throw new TypeError("scheduler lease must exceed its renewal poll");
  let status: UpdateSchedulerStatus = Object.freeze({ state: "standby", scopes: Object.freeze([]) });
  let running = false;

  async function legacyRun(signal: AbortSignal): Promise<void> {
    for (;;) {
      signal.throwIfAborted();
      try {
        await dependencies.refresh.refresh({ trigger: "scheduled", scope: "all-current" }, signal);
        signal.throwIfAborted();
      } catch (error) {
        if (signal.aborted) throw signal.reason ?? error;
        status = Object.freeze({ state: "degraded", scopes: Object.freeze([]) });
        await dependencies.delay.wait(inventoryPollMs, signal);
        continue;
      }
      const scheduledAt = await dependencies.refresh.nextScheduledAt(signal);
      const now = dependencies.clock.nowEpochMilliseconds();
      const untilDue = scheduledAt === undefined ? inventoryPollMs : Math.max(0, scheduledAt - now);
      status = Object.freeze({ state: "running", scopes: Object.freeze([]) });
      await dependencies.delay.wait(Math.max(1, Math.min(inventoryPollMs, untilDue)), signal);
    }
  }

  return Object.freeze({
    async run(signal: AbortSignal): Promise<void> {
      if (signal === null || typeof signal !== "object") throw new TypeError("scheduler signal is required");
      if (running) throw new Error("marketplace update scheduler is already running");
      running = true;
      if (dependencies.leases === undefined || dependencies.leaseIds === undefined) {
        try { await legacyRun(signal); }
        finally { running = false; status = Object.freeze({ state: "stopped", scopes: status.scopes }); }
        return;
      }
      const owner = await dependencies.leaseIds.create(signal);
      const owned = new Map<string, { context: import("../domain/state/scope.js").ScopeContext; scope: ScopeReference }>();
      try {
        for (;;) {
          signal.throwIfAborted();
          const now = dependencies.clock.nowEpochMilliseconds();
          let inventory;
          try {
            inventory = await dependencies.leases.inventory(signal);
          } catch (error) {
            if (signal.aborted) throw signal.reason ?? error;
            status = Object.freeze({ state: "degraded", scopes: status.scopes });
            await dependencies.delay.wait(inventoryPollMs, signal);
            continue;
          }
          const scopeStatuses: Array<{ scope: ScopeReference; ownership: "self" | "other" | "none"; nextAt?: number }> = [];
          let clockRegressed = false;
          let anyEnabled = false;
          let anyOwned = false;
          let earliest: number | undefined;
          for (const plan of inventory.plans) {
            const key = JSON.stringify(plan.scope);
            if (!plan.enabled) {
              owned.delete(key);
              scopeStatuses.push({ scope: plan.scope, ownership: "none", ...(plan.dueAt === undefined ? {} : { nextAt: plan.dueAt }) });
              continue;
            }
            anyEnabled = true;
            const ownership = owned.has(key)
              ? await dependencies.leases.renew(plan.context, owner, now, leaseMs, signal).then((value) => value ? "self" as const : "other" as const)
              : await dependencies.leases.acquire(plan.context, owner, now, leaseMs, signal);
            if (ownership === "self") {
              owned.set(key, { context: plan.context, scope: plan.scope });
              anyOwned = true;
              if (plan.clock === "regressed") clockRegressed = true;
              else if ((plan.dueAt ?? 0) <= now && plan.registrationIds.length > 0) {
                try {
                  if (dependencies.refresh.refreshScheduled !== undefined) {
                    await dependencies.refresh.refreshScheduled({ scope: plan.context, registrationIds: plan.registrationIds, leaseId: owner }, signal);
                  } else {
                    await dependencies.refresh.refresh({ trigger: "scheduled", scope: plan.scope.kind, registrationIds: plan.registrationIds }, signal);
                  }
                } catch (error) {
                  if (signal.aborted) throw signal.reason ?? error;
                }
              }
              if (plan.dueAt !== undefined && plan.dueAt > now && (earliest === undefined || plan.dueAt < earliest)) earliest = plan.dueAt;
            } else {
              owned.delete(key);
            }
            scopeStatuses.push({
              scope: plan.scope,
              ownership: ownership === "unavailable" ? "none" : ownership,
              ...(plan.dueAt === undefined ? {} : { nextAt: plan.dueAt }),
            });
          }
          status = Object.freeze({
            state: !inventory.complete ? "degraded" : !anyEnabled ? "disabled" : clockRegressed ? "clock-regressed" : anyOwned ? "running" : "standby",
            scopes: Object.freeze(scopeStatuses),
          });
          const dueWait = earliest === undefined ? inventoryPollMs : Math.max(1, earliest - dependencies.clock.nowEpochMilliseconds());
          await dependencies.delay.wait(Math.min(inventoryPollMs, dueWait), signal);
        }
      } finally {
        const cleanupSignal = new AbortController().signal;
        await Promise.all([...owned.values()].map((entry) => dependencies.leases!.release(entry.context, owner as UpdateSchedulerLeaseId, cleanupSignal).catch(() => undefined)));
        running = false;
        status = Object.freeze({ state: "stopped", scopes: status.scopes });
      }
    },
    async status(signal: AbortSignal) {
      signal.throwIfAborted();
      return status;
    },
  });
}

export { DEFAULT_INVENTORY_POLL_MS, DEFAULT_LEASE_MS };
