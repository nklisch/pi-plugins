import { HostStatusSnapshotSchema, type HostStartupResult, type HostStatusSnapshot } from "../application/host-observation-contract.js";
import type { UpdateSchedulerStatus } from "../application/marketplace-update-scheduler.js";

export interface HostStatusService {
  snapshot(): HostStatusSnapshot;
}

export interface MutableHostStatus extends HostStatusService {
  update(input: Readonly<{
    scheduler?: UpdateSchedulerStatus["state"];
    unresolvedCount?: number;
    unreadCount?: number;
  }>): void;
}

export function createHostStatusService(input: Readonly<{
  startup: HostStartupResult;
  recovery?: "settled" | "degraded" | "blocked";
  runtime?: "reconciled" | "degraded" | "blocked";
}>): MutableHostStatus {
  let update: HostStatusSnapshot["update"] = Object.freeze({ state: "standby", unresolvedCount: 0, unreadCount: 0 });
  const recovery = input.recovery ?? (input.startup.status === "blocked" ? "blocked" : input.startup.status === "degraded" ? "degraded" : "settled");
  const runtime = input.runtime ?? (input.startup.status === "blocked" ? "blocked" : input.startup.status === "degraded" ? "degraded" : "reconciled");

  function snapshot(): HostStatusSnapshot {
    const localBlocked = recovery === "blocked" || runtime === "blocked";
    const localDegraded = recovery === "degraded" || runtime === "degraded";
    const updateDegraded = update.state === "degraded" || update.state === "clock-regressed";
    return HostStatusSnapshotSchema.parse({
      status: localBlocked ? "blocked" : localDegraded || updateDegraded || input.startup.blocked.length > 0 ? "degraded" : "ready",
      local: { recovery, runtime },
      update,
      blocked: input.startup.blocked,
      capabilities: input.startup.capabilities,
    });
  }

  return Object.freeze({
    snapshot,
    update(next: Parameters<MutableHostStatus["update"]>[0]) {
      update = Object.freeze({
        state: next.scheduler ?? update.state,
        unresolvedCount: next.unresolvedCount ?? update.unresolvedCount,
        unreadCount: next.unreadCount ?? update.unreadCount,
      });
    },
  });
}
