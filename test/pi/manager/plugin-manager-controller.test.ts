import { describe, expect, it, vi } from "vitest";
import { createNativeControlEnvelope } from "../../../src/application/native-control-contract.js";
import type { NativeControlExecutionReport } from "../../../src/application/ports/native-control-execution.js";
import { createPluginManagerController } from "../../../src/pi/manager/plugin-manager-controller.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const snapshotId = `inspection-snapshot-v1:sha256:${"a".repeat(64)}`;
const detailId = `inspection-detail-v1:YWJj.${"b".repeat(64)}`;
const safe = (text: string) => ({ text, escaped: false, truncated: false });

function installedPage(plugin = "demo@market", nextCursor?: string) {
  return {
    snapshotId,
    condition: "ready",
    items: [{
      detailId,
      subject: "installed",
      scope: { kind: "user" },
      plugin,
      name: safe(plugin.split("@")[0]!),
      marketplace: safe("market"),
      revision: { installed: safe("1.0.0"), resolution: "exact" },
      condition: "ready",
      freshness: { status: "current", basis: "state" },
      diagnosticCounts: { error: 0, warning: 0, info: 0 },
    }],
    observations: [{ scope: { kind: "user" }, status: "ready", generation: 1, corruptionCodes: [] }],
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

function updateStatus(unread = 0, unresolved = 0) {
  return {
    policy: { global: { application: "manual", cadence: "balanced" }, scopes: [], policies: [], inventoryComplete: true },
    scheduler: { state: "standby", scopes: [] },
    unreadCount: unread,
    unresolvedCount: unresolved,
  };
}

function report(command: "inspection.list" | "updates.status", data: unknown, page?: { next?: string }): NativeControlExecutionReport {
  return {
    envelope: createNativeControlEnvelope({ executionId, command, status: "ok", data: data as never, ...(page === undefined ? {} : { page }) }),
    delivery: "complete",
    deliveredThrough: -1,
  };
}

describe("plugin manager controller", () => {
  it("loads installed authority and update counts only through canonical facade argv", async () => {
    const calls: readonly string[][] = [];
    const execute = vi.fn(async (argv: readonly string[]) => {
      (calls as string[][]).push([...argv]);
      return argv[0] === "updates" ? report("updates.status", updateStatus(2, 3)) : report("inspection.list", installedPage());
    });
    const controller = createPluginManagerController({ execute });
    await controller.refresh("all");
    expect(calls).toContainEqual(["list", "--scope", "all-current", "--query", "", "--limit", "50"]);
    expect(calls).toContainEqual(["updates", "status", "--scope", "all-current"]);
    expect(controller.state().page.rows[0]).toMatchObject({ plugin: "demo@market", scope: "user", title: "demo" });
    expect(controller.state().updateCounts).toEqual({ unread: 2, unresolved: 3 });
  });

  it("uses latest-intent-wins for search and ignores a late aborted response", async () => {
    const pending: Array<{ argv: readonly string[]; resolve: (value: NativeControlExecutionReport) => void; signal: AbortSignal }> = [];
    const execute = vi.fn((argv: readonly string[], signal: AbortSignal) => new Promise<NativeControlExecutionReport>((resolve) => pending.push({ argv, resolve, signal })));
    const controller = createPluginManagerController({ execute });
    controller.dispatch({ type: "set-query", query: "old" });
    const old = controller.refresh("view");
    controller.dispatch({ type: "set-query", query: "new" });
    const current = controller.refresh("view");
    expect(pending[0]!.signal.aborted).toBe(true);
    pending[1]!.resolve(report("inspection.list", installedPage("new@market")));
    await current;
    pending[0]!.resolve(report("inspection.list", installedPage("old@market")));
    await old;
    expect(controller.state().page.rows.map((row) => row.plugin)).toEqual(["new@market"]);
  });

  it("follows only facade cursors, appends pages, and loads exact detail IDs", async () => {
    const cursor = `inspection-cursor-v1:YWJj.${"c".repeat(64)}`;
    const execute = vi.fn(async (argv: readonly string[]) => {
      if (argv[0] === "show") {
        return {
          envelope: createNativeControlEnvelope({ executionId, command: "inspection.show", status: "stale", data: { kind: "stale", action: "retry-read" } as never }),
          delivery: "complete" as const,
          deliveredThrough: -1,
        };
      }
      return report("inspection.list", installedPage("demo@market", cursor), { next: cursor });
    });
    const controller = createPluginManagerController({ execute });
    await controller.refresh("view");
    controller.dispatch({ type: "next-page" });
    await controller.idle();
    expect(execute).toHaveBeenCalledWith(expect.arrayContaining(["--cursor", cursor]), expect.any(AbortSignal));
    controller.dispatch({ type: "open-detail" });
    await controller.idle();
    expect(execute).toHaveBeenCalledWith([
      "show", "demo@market", "--scope", "user", "--snapshot-id", snapshotId, "--detail-id", detailId,
    ], expect.any(AbortSignal));
    expect(controller.state().detail.envelope?.status).toBe("stale");
  });

  it("keeps safe dynamic completion only and clears all ephemeral state on close", async () => {
    const execute = vi.fn(async (argv: readonly string[]) => argv[0] === "updates"
      ? report("updates.status", updateStatus())
      : report("inspection.list", installedPage()));
    const controller = createPluginManagerController({ execute });
    await controller.refresh("all");
    expect(controller.dynamicCompletions()).toEqual([{ category: "plugin", value: "demo@market", safe: safe("demo") }]);
    await controller.close("quit");
    expect(controller.state().page.rows).toEqual([]);
    expect(controller.dynamicCompletions()).toEqual([]);
    await expect(controller.refresh()).resolves.toBeUndefined();
  });
});
