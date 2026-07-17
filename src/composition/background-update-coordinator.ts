import type { AutomaticUpdateCoordinator } from "../application/automatic-update-coordinator.js";
import type { MarketplaceUpdateScheduler } from "../application/marketplace-update-scheduler.js";
import type { UpdateNotificationService } from "../application/update-notification-service.js";
import type { MutableHostStatus } from "./host-status-service.js";

export interface BackgroundUpdateCoordinator {
  start(): Promise<void>;
  close(): Promise<void>;
}

/** Owns the existing scheduler task; it creates no second timer or job authority. */
export function createBackgroundUpdateCoordinator(dependencies: Readonly<{
  scheduler: MarketplaceUpdateScheduler;
  notifications?: UpdateNotificationService;
  automatic?: AutomaticUpdateCoordinator;
  status: MutableHostStatus;
  enabled(signal: AbortSignal): Promise<boolean>;
}>): BackgroundUpdateCoordinator {
  let controller: AbortController | undefined;
  let task: Promise<void> | undefined;
  let startPromise: Promise<void> | undefined;
  let closePromise: Promise<void> | undefined;

  return Object.freeze({
    start() {
      startPromise ??= (async () => {
        if (closePromise !== undefined) return;
        controller = new AbortController();
        if (!(await dependencies.enabled(controller.signal))) {
          dependencies.status.update({ scheduler: "disabled" });
          return;
        }
        // Local readiness has already been published by the caller. Ledger
        // maintenance can therefore degrade independently without delaying Pi.
        if (dependencies.notifications !== undefined) {
          try {
            const reconciled = await dependencies.notifications.reconcile(controller.signal);
            dependencies.status.update({ unreadCount: reconciled.unreadCount, unresolvedCount: reconciled.unresolvedCount });
            await dependencies.notifications.dispatch({}, controller.signal);
          } catch (error) {
            if (controller.signal.aborted) return;
            dependencies.status.update({ scheduler: "degraded" });
          }
        }
        if (dependencies.automatic !== undefined) {
          try { await dependencies.automatic.run({ limit: 20 }, controller.signal); }
          catch (error) { if (controller.signal.aborted) return; }
        }
        dependencies.status.update({ scheduler: "running" });
        task = dependencies.scheduler.run(controller.signal).catch((error) => {
          if (!controller?.signal.aborted) dependencies.status.update({ scheduler: "degraded" });
          void error;
        });
      })();
      return startPromise;
    },
    close() {
      closePromise ??= (async () => {
        controller?.abort(new Error("background update coordinator closed"));
        await startPromise?.catch(() => undefined);
        await task?.catch(() => undefined);
        dependencies.status.update({ scheduler: "stopped" });
      })();
      return closePromise;
    },
  });
}
