import { describe, expect, it, vi } from "vitest";
import { createNativeControlEnvelope } from "../../../src/application/native-control-contract.js";
import type { NativeControlFrameSink } from "../../../src/application/ports/native-control-execution.js";
import { createPluginManagerActionRunner } from "../../../src/pi/manager/plugin-manager-actions.js";
import type { PluginManagerRow } from "../../../src/pi/manager/plugin-manager-model.js";

const executionId = "native-control-execution-v1:123e4567-e89b-42d3-a456-426614174000" as never;
const snapshotId = `inspection-snapshot-v1:sha256:${"a".repeat(64)}`;
const detailId = `inspection-detail-v1:YWJj.${"b".repeat(64)}`;
const row: PluginManagerRow = {
  key: { subject: "installed", key: "user:demo@market", snapshotId, detailId },
  title: "demo",
  subtitle: "market · user",
  status: "ready",
  scope: "user",
  plugin: "demo@market",
  completion: { category: "plugin", value: "demo@market", safe: { text: "demo", escaped: false, truncated: false } },
  data: {},
};

function result(status: "ok" | "stale" | "cancelled" = "ok") {
  return createNativeControlEnvelope({ executionId, command: "lifecycle.enable", status });
}

describe("plugin manager action runner", () => {
  it("routes exact hidden IDs through one canonical facade command and streams ordered frames", async () => {
    const frames: unknown[] = [];
    const execute = vi.fn(async (argv: readonly string[], options: { sink: NativeControlFrameSink }, signal: AbortSignal) => {
      await options.sink.write({ schemaVersion: 1, type: "accepted", executionId, sequence: 0, command: "lifecycle.enable" }, signal);
      await options.sink.write({ schemaVersion: 1, type: "progress", executionId, sequence: 1, phase: "activation-transaction", state: "started", safe: [] }, signal);
      const envelope = result();
      await options.sink.write({ schemaVersion: 1, type: "result", executionId, sequence: 2, result: envelope }, signal);
      return { envelope, delivery: "complete" as const, deliveredThrough: 2 };
    });
    const runner = createPluginManagerActionRunner({ execute, onFrame: (frame) => frames.push(frame) });
    await expect(runner.run({ action: "enable", row })).resolves.toMatchObject({ presentation: "local", envelope: { status: "ok" } });
    expect(execute).toHaveBeenCalledWith([
      "enable", "demo@market", "--scope", "user", "--snapshot-id", snapshotId, "--detail-id", detailId, "--yes",
    ], expect.objectContaining({ sink: expect.any(Object) }), expect.any(AbortSignal));
    expect(frames.map((frame: any) => frame.sequence)).toEqual([0, 1, 2]);
  });

  it("sends one abort and waits for stronger owner cancellation result", async () => {
    let aborts = 0;
    const execute = vi.fn(async (_argv: readonly string[], _options: unknown, signal: AbortSignal) => {
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => { aborts += 1; resolve(); }, { once: true }));
      return { envelope: result("cancelled"), delivery: "complete" as const, deliveredThrough: -1 };
    });
    const runner = createPluginManagerActionRunner({ execute });
    const pending = runner.run({ action: "enable", row });
    runner.cancel();
    runner.cancel();
    await expect(pending).resolves.toMatchObject({ envelope: { status: "cancelled" } });
    expect(aborts).toBe(1);
  });

  it("refreshes stale authority without replaying the mutation", async () => {
    const onStale = vi.fn();
    const execute = vi.fn(async () => ({ envelope: result("stale"), delivery: "complete" as const, deliveredThrough: -1 }));
    const runner = createPluginManagerActionRunner({ execute, onStale });
    await runner.run({ action: "enable", row });
    expect(execute).toHaveBeenCalledOnce();
    expect(onStale).toHaveBeenCalledWith(expect.objectContaining({ status: "stale" }));
  });

  it("hands activating results to a claimed reload successor", async () => {
    const handoff = {
      open: vi.fn(() => ({ id: "ticket" })),
      publish: vi.fn(() => "successor"),
      fail: vi.fn(),
    } as any;
    const execute = vi.fn(async () => ({ envelope: result(), delivery: "complete" as const, deliveredThrough: -1 }));
    const runner = createPluginManagerActionRunner({ execute, handoff, session: { sessionId: "s1", cwd: "/workspace" } });
    await expect(runner.run({ action: "enable", row })).resolves.toMatchObject({ presentation: "successor" });
    expect(handoff.open).toHaveBeenCalledWith({ sessionId: "s1", cwd: "/workspace", destination: "operation-result" });
    expect(handoff.publish).toHaveBeenCalledWith({ id: "ticket" }, expect.objectContaining({ status: "ok" }));
  });

  it("serializes foreground mutations", async () => {
    let resolve!: () => void;
    const execute = vi.fn(async () => { await new Promise<void>((done) => { resolve = done; }); return { envelope: result(), delivery: "complete" as const, deliveredThrough: -1 }; });
    const runner = createPluginManagerActionRunner({ execute });
    const first = runner.run({ action: "enable", row });
    await expect(runner.run({ action: "disable", row })).rejects.toThrow(/already running/);
    resolve();
    await first;
  });
});
