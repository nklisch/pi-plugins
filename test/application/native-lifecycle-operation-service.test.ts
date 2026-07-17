import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createNativeLifecycleOperationService } from "../../src/application/native-lifecycle-operation-service.js";

const digest = (value: string) => `sha256:${value.repeat(64)}` as never;
const request = {
  operation: "disable" as const,
  target: { inspectionSnapshotId: `inspection-snapshot-v1:sha256:${"1".repeat(64)}` as never, detailId: `inspection-detail-v1:e30.${"2".repeat(64)}` as never },
};
const binding = {
  scope: { kind: "user" as const }, plugin: "demo@market" as never, stateGeneration: 0 as never,
  selectedRevision: digest("3"), activation: "enabled" as const, targetDigest: digest("4"),
  inspectionSnapshotId: request.target.inspectionSnapshotId, detailId: request.target.detailId, transition: "none" as const,
};
const target = { binding, expectation: { generation: 0, plugin: binding.plugin, selectedRevision: binding.selectedRevision, activation: binding.activation, targetDigest: binding.targetDigest, pendingTransition: "none" }, scope: { kind: "user" }, record: {}, snapshot: {}, capabilityDigest: digest("5") } as any;

function harness(execute?: any) {
  let monotonic = 0;
  const executor = execute ?? vi.fn(async (context: any) => ({ kind: "current-state", operation: context.operation, previewId: context.previewId, progress: [], diagnostics: [], effects: { state: "unchanged", projectFile: "unchanged", completedActionIds: [], pendingActionIds: [] }, reason: "already-disabled", target: context.target.binding }));
  const composed = createNativeLifecycleOperationService({
    targets: { async resolve() { return { kind: "ready" as const, target }; }, async validate() { return { kind: "ready" as const, target }; } },
    updates: { async acquire() { return { kind: "rejected" as const, reason: "candidate" as const }; }, async validate() { return { kind: "rejected" as const, reason: "candidate" as const }; } },
    lifecycle: { execute: executor },
    sync: { async preview() { return { kind: "rejected" as const, code: "ADAPTER_FAILED" as const }; }, async apply() { throw new Error("not used"); } },
    clock: { nowEpochMilliseconds: () => 1_000 as never, monotonicMilliseconds: () => monotonic },
    sessionIds: { async create() { return randomUUID() as never; } },
    hostEpoch: digest("6"),
    sha256: (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest()),
  } as any);
  return { ...composed, execute: executor, advance(value: number) { monotonic += value; } };
}

const signal = new AbortController().signal;

describe("native lifecycle operation facade", () => {
  it("makes preview/apply and explicit-decision run use the same executor", async () => {
    const value = harness();
    const opened = await value.application.preview(request, signal);
    expect(opened.kind).toBe("opened");
    if (opened.kind !== "opened") return;
    const confirmation = { kind: "confirm" as const, previewId: opened.session.preview.previewId, expectedVersion: opened.session.version, operation: "disable" as const };
    expect(await value.application.apply({ token: opened.session.token, confirmation }, {}, signal)).toMatchObject({ kind: "current-state" });
    expect(await value.application.run(request, { decisionProvider: async (session) => ({ kind: "confirm", previewId: session.preview.previewId, expectedVersion: session.version, operation: "disable" }) }, signal)).toMatchObject({ kind: "current-state" });
    expect(value.execute).toHaveBeenCalledTimes(2);
  });

  it("rejects stale confirmation before mutation and gives one concurrent apply owner", async () => {
    let resolve!: (result: any) => void;
    const execution = vi.fn((context: any) => new Promise((done) => { resolve = (result) => done(result ?? { kind: "current-state", operation: context.operation, previewId: context.previewId, progress: [], diagnostics: [], effects: { state: "unchanged", projectFile: "unchanged", completedActionIds: [], pendingActionIds: [] }, reason: "already-disabled", target: context.target.binding }); }));
    const value = harness(execution);
    const opened = await value.application.preview(request, signal);
    if (opened.kind !== "opened") throw new Error("preview fixture failed");
    const stale = { kind: "confirm" as const, previewId: opened.session.preview.previewId, expectedVersion: 99, operation: "disable" as const };
    expect(await value.application.apply({ token: opened.session.token, confirmation: stale }, {}, signal)).toMatchObject({ kind: "stale", reason: "session" });
    expect(execution).not.toHaveBeenCalled();
    const confirmation = { ...stale, expectedVersion: 0 };
    const owner = value.application.apply({ token: opened.session.token, confirmation }, {}, signal);
    await Promise.resolve();
    expect(await value.application.apply({ token: opened.session.token, confirmation }, {}, signal)).toMatchObject({ kind: "conflict", reason: "operation-in-progress" });
    resolve(undefined);
    expect(await owner).toMatchObject({ kind: "current-state" });
    expect(execution).toHaveBeenCalledOnce();
  });

  it("preserves recovery evidence when cancellation arrives after admitted execution", async () => {
    let resolve!: (result: any) => void;
    const execution = vi.fn((context: any) => new Promise((done) => { resolve = done; }));
    const value = harness(execution);
    const opened = await value.application.preview(request, signal);
    if (opened.kind !== "opened") throw new Error("preview fixture failed");
    const applying = value.application.apply({ token: opened.session.token, confirmation: { kind: "confirm", previewId: opened.session.preview.previewId, expectedVersion: 0, operation: "disable" } }, {}, signal);
    await Promise.resolve();
    expect(await value.application.cancel({ token: opened.session.token }, signal)).toMatchObject({ kind: "accepted", state: "applying" });
    resolve({ kind: "recovery-required", operation: "disable", previewId: opened.session.preview.previewId, progress: [], diagnostics: [], effects: { state: "unknown", projectFile: "unchanged", completedActionIds: [], pendingActionIds: [] }, code: "PENDING_TRANSITION", action: "run-recovery" });
    expect(await applying).toMatchObject({ kind: "recovery-required" });
  });

  it("reaps idle sessions and close waits for an admitted operation", async () => {
    let resolve!: (result: any) => void;
    const value = harness((context: any) => new Promise((done) => { resolve = () => done({ kind: "current-state", operation: context.operation, previewId: context.previewId, progress: [], diagnostics: [], effects: { state: "unchanged", projectFile: "unchanged", completedActionIds: [], pendingActionIds: [] }, reason: "already-disabled", target: context.target.binding }); }));
    const expired = await value.application.preview(request, signal);
    if (expired.kind !== "opened") throw new Error("preview fixture failed");
    value.advance(15 * 60_000);
    expect(await value.application.status({ token: expired.session.token }, signal)).toEqual({ kind: "expired" });

    const opened = await value.application.preview(request, signal);
    if (opened.kind !== "opened") throw new Error("preview fixture failed");
    const applying = value.application.apply({ token: opened.session.token, confirmation: { kind: "confirm", previewId: opened.session.preview.previewId, expectedVersion: 0, operation: "disable" } }, {}, signal);
    await Promise.resolve();
    value.quiesce();
    let closed = false;
    const closing = value.close().then(() => { closed = true; });
    await Promise.resolve();
    expect(closed).toBe(false);
    resolve(undefined);
    await applying;
    await closing;
    expect(closed).toBe(true);
    await value.close();
  });
});
