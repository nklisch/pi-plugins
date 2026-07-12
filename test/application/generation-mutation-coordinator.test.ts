import { describe, expect, it } from "vitest";
import {
  CommittedMutationCleanupError,
  MutationCleanupError,
  createGenerationMutationCoordinator,
} from "../../src/application/generation-mutation-coordinator.js";
import { createKeyedMutationScheduler } from "../../src/application/keyed-mutation-scheduler.js";
import {
  parseStateMutation,
  type GenerationSnapshot,
  type Generation,
  type StateCommitResult,
  type StateLoadResult,
  type VerifiedStateMutation,
} from "../../src/application/state-contract.js";
import type { ScopeLockManager } from "../../src/application/ports/scope-lock.js";
import type { LifecycleStateStore } from "../../src/application/ports/lifecycle-state-store.js";
import { HostConfigDocumentSchemaV1 } from "../../src/domain/state/config-state.js";
import type { ScopeContext, ScopeReference } from "../../src/domain/state/scope.js";
import type { PluginKey } from "../../src/domain/identity.js";

const user: ScopeContext = { kind: "user" };
const plugin = "demo@marketplace" as PluginKey;
const sha256 = () => new Uint8Array(32);
const config = HostConfigDocumentSchemaV1.parse({ schemaVersion: 1, generation: 0, records: [] });

function snapshot(scope: ScopeContext, generation: number): GenerationSnapshot {
  return { scope, generation } as GenerationSnapshot;
}

function mutation(expectedGeneration = 0, scope: ScopeContext = user): VerifiedStateMutation {
  return parseStateMutation({
    scope,
    expectedGeneration,
    replace: { config: HostConfigDocumentSchemaV1.parse({ ...config, generation: expectedGeneration }) },
  }, sha256);
}

function lockManager(options: Readonly<{
  events: string[];
  releaseError?: unknown;
  owned?: () => boolean;
}>): ScopeLockManager {
  return {
    async acquire(scope: ScopeReference, signal: AbortSignal) {
      options.events.push("lock.acquire");
      return {
        scope,
        async assertOwned(assertSignal: AbortSignal) {
          options.events.push("lock.assert");
          if (assertSignal.aborted) throw assertSignal.reason;
          if (options.owned !== undefined && !options.owned()) throw new Error("lease lost");
          void signal;
        },
        async release() {
          options.events.push("lock.release");
          if (options.releaseError !== undefined) throw options.releaseError;
        },
      };
    },
  };
}

function stateStore(options: Readonly<{
  events: string[];
  loaded?: StateLoadResult;
  commit?: (mutation: VerifiedStateMutation) => Promise<StateCommitResult>;
}>): LifecycleStateStore {
  return {
    async read() {
      options.events.push("state.read");
      return options.loaded ?? { ok: true, snapshot: snapshot(user, 0) };
    },
    async commit(value) {
      options.events.push("state.commit");
      return options.commit?.(value) ?? { kind: "committed", snapshot: snapshot(user, 1) };
    },
  };
}

function coordinator(events: string[], store: LifecycleStateStore, locks?: ScopeLockManager) {
  return createGenerationMutationCoordinator({
    scheduler: createKeyedMutationScheduler(),
    locks: locks ?? lockManager({ events }),
    state: store,
  });
}

describe("generation-guarded prepared mutation coordinator", () => {
  it("returns stale before callback or promotion work", async () => {
    const events: string[] = [];
    let callback = false;
    const service = coordinator(events, stateStore({ events, loaded: { ok: true, snapshot: snapshot(user, 3) } }));
    const result = await service.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async () => {
        callback = true;
        return { mutation: mutation(), value: "never" };
      },
      new AbortController().signal,
    );
    expect(result).toEqual({ kind: "stale-generation", expected: 0, actual: 3 });
    expect(callback).toBe(false);
    expect(events).toEqual(["lock.acquire", "lock.assert", "state.read", "lock.release"]);
  });

  it("keeps the critical order and commits a verified mutation once", async () => {
    const events: string[] = [];
    const service = coordinator(events, stateStore({ events }));
    const result = await service.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async (context) => {
        events.push("callback");
        await context.assertOwned();
        return { mutation: mutation(), value: "promoted" };
      },
      new AbortController().signal,
    );
    expect(result).toEqual({ kind: "committed", value: "promoted", snapshot: snapshot(user, 1) });
    expect(events).toEqual([
      "lock.acquire", "lock.assert", "state.read", "lock.assert", "callback", "lock.assert", "lock.assert", "state.commit", "lock.release",
    ]);
  });

  it("rejects unverified, wrong-generation, and wrong-scope callback output before commit", async () => {
    const cases: readonly [string, unknown][] = [
      ["unverified", { value: "bad" }],
      ["wrong generation", { mutation: mutation(1), value: "bad" }],
    ];
    for (const [name, output] of cases) {
      const events: string[] = [];
      const service = coordinator(events, stateStore({ events }));
      const result = await service.runPreparedMutation(
        { scope: user, plugins: [plugin], expectedGeneration: 0 },
        async () => output as never,
        new AbortController().signal,
      ).then(() => undefined, (error: unknown) => error);
      expect(result, name).toBeInstanceOf(Error);
      expect(events).not.toContain("state.commit");
    }

    const project = {
      kind: "project" as const,
      identity: {
        kind: "path-only" as const,
        canonicalRoot: "file:///workspace/other/" as never,
        limitation: "identity-changes-with-canonical-root" as const,
      },
      projectKey: `project-v1:sha256:${"c".repeat(64)}` as never,
    } satisfies ScopeContext;
    const wrongScopeEvents: string[] = [];
    const wrongScopeService = coordinator(
      wrongScopeEvents,
      stateStore({ loaded: { ok: true, snapshot: snapshot(project, 0) }, events: wrongScopeEvents }),
    );
    const wrongScope = await wrongScopeService.runPreparedMutation(
      { scope: project, plugins: [plugin], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: "bad" }),
      new AbortController().signal,
    ).then(() => undefined, (error: unknown) => error);
    expect(wrongScope).toBeInstanceOf(Error);
    expect(wrongScopeEvents).not.toContain("state.commit");
  });

  it("converts a store-level stale response into the typed outer result", async () => {
    const events: string[] = [];
    const service = coordinator(events, stateStore({
      events,
      commit: async () => ({ kind: "stale-generation", expected: 0, actual: 7 }),
    }));
    const result = await service.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: "not committed" }),
      new AbortController().signal,
    );
    expect(result).toEqual({ kind: "stale-generation", expected: 0, actual: 7 });
  });

  it("preserves abort identity when ownership is released before the callback", async () => {
    const events: string[] = [];
    const reason = new Error("deadline");
    const controller = new AbortController();
    let owned = true;
    const service = coordinator(events, stateStore({ events }), lockManager({ events, owned: () => owned }));
    owned = false;
    const result = await service.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: "bad" }),
      controller.signal,
    ).then(() => undefined, (error: unknown) => error);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("lease lost");
    controller.abort(reason);
  });

  it("retains committed evidence when release fails and both failures when work fails", async () => {
    const events: string[] = [];
    const releaseError = new Error("cleanup failed");
    const service = coordinator(events, stateStore({ events }), lockManager({ events, releaseError }));
    const committedFailure = await service.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: 42 }),
      new AbortController().signal,
    ).then(() => undefined, (error: unknown) => error);
    expect(committedFailure).toBeInstanceOf(CommittedMutationCleanupError);
    expect((committedFailure as CommittedMutationCleanupError<number>).committed.value).toBe(42);
    expect((committedFailure as CommittedMutationCleanupError<number>).cause).toBe(releaseError);

    const callbackError = new Error("callback failed");
    const secondEvents: string[] = [];
    const second = coordinator(secondEvents, stateStore({ events: secondEvents }), lockManager({ events: secondEvents, releaseError }));
    const workFailure = await second.runPreparedMutation(
      { scope: user, plugins: [plugin], expectedGeneration: 0 },
      async () => { throw callbackError; },
      new AbortController().signal,
    ).then(() => undefined, (error: unknown) => error);
    expect(workFailure).toBeInstanceOf(MutationCleanupError);
    expect((workFailure as MutationCleanupError).operationError).toBe(callbackError);
    expect((workFailure as MutationCleanupError).cleanupError).toBe(releaseError);
  });

  it("rejects duplicate plugins before acquiring a lock and allows an explicit empty scope mutation", async () => {
    const events: string[] = [];
    const service = coordinator(events, stateStore({ events }));
    await expect(service.runPreparedMutation(
      { scope: user, plugins: [plugin, plugin], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: "bad" }),
      new AbortController().signal,
    )).rejects.toThrow(/unique/);
    expect(events).toEqual([]);

    const result = await service.runPreparedMutation(
      { scope: user, plugins: [], expectedGeneration: 0 },
      async () => ({ mutation: mutation(), value: "scope" }),
      new AbortController().signal,
    );
    expect(result.kind).toBe("committed");
  });
});
