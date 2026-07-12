import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createKeyedMutationScheduler } from "../../src/application/keyed-mutation-scheduler.js";
import { createGenerationMutationCoordinator } from "../../src/application/generation-mutation-coordinator.js";
import { parseStateMutation, type GenerationSnapshot, type VerifiedStateMutation } from "../../src/application/state-contract.js";
import { createSqliteScopeLockManager } from "../../src/infrastructure/state/sqlite-scope-lock.js";
import type { LifecycleStateStore } from "../../src/application/ports/lifecycle-state-store.js";
import { GenerationSchema, HostConfigDocumentSchemaV1 } from "../../src/domain/state/config-state.js";
import type { ScopeContext } from "../../src/domain/state/scope.js";
import type { Generation } from "../../src/domain/state/config-state.js";
import type { StateCommitResult, StateLoadResult } from "../../src/application/state-contract.js";
import type { PluginKey } from "../../src/domain/identity.js";

const scope: ScopeContext = { kind: "user" };
const plugin = "demo@marketplace" as PluginKey;
const sha256 = () => new Uint8Array(32);
const mutation = parseStateMutation({
  scope,
  expectedGeneration: 0,
  replace: { config: HostConfigDocumentSchemaV1.parse({ schemaVersion: 1, generation: 0, records: [] }) },
}, sha256);

function snapshot(generation: Generation): GenerationSnapshot {
  return { scope, generation } as GenerationSnapshot;
}

class SharedGenerationStore implements LifecycleStateStore {
  generation: Generation = GenerationSchema.parse(0);
  commits = 0;
  reads = 0;

  async read(): Promise<StateLoadResult> {
    this.reads += 1;
    return { ok: true, snapshot: snapshot(this.generation) };
  }

  async commit(value: VerifiedStateMutation): Promise<StateCommitResult> {
    if (value.expectedGeneration !== this.generation) {
      return { kind: "stale-generation", expected: value.expectedGeneration, actual: this.generation };
    }
    this.generation = GenerationSchema.parse(this.generation + 1);
    this.commits += 1;
    return { kind: "committed", snapshot: snapshot(this.generation) };
  }
}

describe("generation-locking integration", () => {
  it("allows exactly one same-generation writer to commit against a shared scope", async () => {
    const lockRoot = await mkdtemp(join(process.cwd(), ".test-generation-locking-"));
    try {
      const locks = await createSqliteScopeLockManager({
        lockRoot,
        retryDelayMs: { minimum: 1, maximum: 2 },
        verifyLocalFilesystem: async () => {},
      });
      const state = new SharedGenerationStore();
      const coordinator = createGenerationMutationCoordinator({
        scheduler: createKeyedMutationScheduler(),
        locks,
        state,
      });
      let callbackCount = 0;
      const call = () => coordinator.runPreparedMutation(
        { scope, plugins: [plugin], expectedGeneration: 0 },
        async () => {
          callbackCount += 1;
          return { mutation, value: "promoted" };
        },
        new AbortController().signal,
      );

      const results = await Promise.all([call(), call()]);
      expect(results.map((result) => result.kind).sort()).toEqual(["committed", "stale-generation"]);
      expect(callbackCount).toBe(1);
      expect(state.commits).toBe(1);
      expect(state.generation).toBe(1);
      expect(state.reads).toBe(2);
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });

  it("keeps independent scope locks concurrently usable", async () => {
    const lockRoot = await mkdtemp(join(process.cwd(), ".test-generation-locking-"));
    try {
      const locks = await createSqliteScopeLockManager({
        lockRoot,
        retryDelayMs: { minimum: 1, maximum: 2 },
        verifyLocalFilesystem: async () => {},
      });
      const userLease = await locks.acquire({ kind: "user" }, new AbortController().signal);
      const projectLease = await locks.acquire({ kind: "project", projectKey: `project-v1:sha256:${"d".repeat(64)}` as never }, new AbortController().signal);
      await Promise.all([userLease.release(), projectLease.release()]);
    } finally {
      await rm(lockRoot, { recursive: true, force: true });
    }
  });
});
