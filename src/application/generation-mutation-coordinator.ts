import { BoundaryError } from "../domain/errors.js";
import { PluginKeySchema, type PluginKey } from "../domain/identity.js";
import {
  GenerationSchema,
  type Generation,
} from "../domain/state/config-state.js";
import {
  ScopeContextSchema,
  toScopeReference,
  type ScopeContext,
  type ScopeReference,
} from "../domain/state/scope.js";
import {
  isVerifiedStateMutation,
  type GenerationSnapshot,
  type StateCommitResult,
  type StateLoadResult,
  type VerifiedStateMutation,
} from "./state-contract.js";
import type { LifecycleStateStore } from "./ports/lifecycle-state-store.js";
import type { ScopeLockLease, ScopeLockManager } from "./ports/scope-lock.js";
import type {
  KeyedMutationScheduler,
  MutationExecutionContext,
  MutationSubject,
} from "./mutation-coordination.js";

export type PreparedMutationRequest = Readonly<{
  scope: ScopeContext;
  plugins: readonly PluginKey[];
  expectedGeneration: Generation;
}>;

export type PreparedMutationContext = Readonly<{
  snapshot: GenerationSnapshot;
  assertOwned(): Promise<void>;
}>;

export type PreparedMutation<T> = Readonly<{
  mutation: VerifiedStateMutation;
  value: T;
}>;

export type GenerationMutationResult<T> =
  | Readonly<{
      kind: "committed";
      value: T;
      snapshot: GenerationSnapshot;
    }>
  | Readonly<{
      kind: "stale-generation";
      expected: Generation;
      actual: Generation;
    }>;

/** Retains both failures when a mutation and its lock cleanup fail together. */
export class MutationCleanupError extends Error {
  readonly operationError: unknown;
  readonly cleanupError: unknown;
  readonly causes: readonly [unknown, unknown];

  constructor(operationError: unknown, cleanupError: unknown) {
    super("mutation failed and scope-lock cleanup also failed", { cause: operationError });
    this.name = "MutationCleanupError";
    this.operationError = operationError;
    this.cleanupError = cleanupError;
    this.causes = [operationError, cleanupError];
  }
}

/**
 * A committed state result is durable even if the lease cannot be cleaned up.
 * Callers receive the evidence needed to inspect/recover instead of blindly
 * replaying a mutation whose promotion may already be visible.
 */
export class CommittedMutationCleanupError<T> extends Error {
  readonly committed: Readonly<{ value: T; snapshot: GenerationSnapshot }>;
  readonly cleanupError: unknown;
  override readonly cause: unknown;

  constructor(committed: Readonly<{ value: T; snapshot: GenerationSnapshot }>, cleanupError: unknown) {
    super("mutation committed but scope-lock cleanup failed", { cause: cleanupError });
    this.name = "CommittedMutationCleanupError";
    this.committed = committed;
    this.cleanupError = cleanupError;
    this.cause = cleanupError;
  }
}

export interface GenerationMutationCoordinator {
  runPreparedMutation<T>(
    request: PreparedMutationRequest,
    prepareCommit: (context: PreparedMutationContext) => Promise<PreparedMutation<T>>,
    signal: AbortSignal,
  ): Promise<GenerationMutationResult<T>>;
}

export type GenerationMutationCoordinatorDependencies = Readonly<{
  scheduler: KeyedMutationScheduler;
  locks: ScopeLockManager;
  state: LifecycleStateStore;
}>;

function assertSignal(signal: AbortSignal): void {
  if (
    signal === null ||
    typeof signal !== "object" ||
    typeof signal.addEventListener !== "function" ||
    typeof signal.removeEventListener !== "function" ||
    typeof signal.aborted !== "boolean"
  ) {
    throw new TypeError("prepared mutation requires an AbortSignal");
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => sameJson(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  return keys.length === Object.keys(rightRecord).length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(rightRecord, key) && sameJson(leftRecord[key], rightRecord[key]));
}

function sameScopeContext(left: ScopeContext, right: ScopeContext): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "user" || right.kind === "user") return true;
  return left.projectKey === right.projectKey && sameJson(left.identity, right.identity);
}

function sameScopeReference(left: ScopeReference, right: ScopeReference): boolean {
  if (left.kind === "user") return right.kind === "user";
  return right.kind === "project" && left.projectKey === right.projectKey;
}

function validateRequest(request: PreparedMutationRequest): {
  readonly scope: ScopeContext;
  readonly scopeReference: ScopeReference;
  readonly plugins: readonly PluginKey[];
} {
  if (request === null || typeof request !== "object") throw new TypeError("prepared mutation request is required");
  const scope = ScopeContextSchema.parse(request.scope);
  const expectedGeneration = GenerationSchema.parse(request.expectedGeneration);
  void expectedGeneration;
  if (!Array.isArray(request.plugins)) throw new TypeError("prepared mutation plugins must be an array");
  const plugins = request.plugins.map((plugin) => PluginKeySchema.parse(plugin));
  if (new Set(plugins).size !== plugins.length) throw new TypeError("prepared mutation plugins must be unique");
  return {
    scope,
    scopeReference: toScopeReference(scope),
    plugins,
  };
}

function subjects(scope: ScopeReference, plugins: readonly PluginKey[]): readonly MutationSubject[] {
  return plugins.map((plugin) => ({ scope, plugin }));
}

function validateSnapshot(snapshot: GenerationSnapshot, scope: ScopeContext): GenerationSnapshot {
  if (snapshot === null || typeof snapshot !== "object") throw new Error("state store returned an invalid generation snapshot");
  const snapshotScope = ScopeContextSchema.parse(snapshot.scope);
  if (!sameScopeContext(snapshotScope, scope) || !sameScopeReference(toScopeReference(snapshotScope), toScopeReference(scope))) {
    throw new Error("state store returned a snapshot for the wrong scope");
  }
  GenerationSchema.parse(snapshot.generation);
  return snapshot;
}

function loadFailure(result: Extract<StateLoadResult, { ok: false }>): Error {
  return new BoundaryError({
    code: "ADAPTER_FAILED",
    operation: "generation-mutation.read",
    message: "authoritative lifecycle state could not be loaded for mutation",
    cause: result,
  });
}

function staleResult(expected: Generation, actual: Generation): GenerationMutationResult<never> {
  return {
    kind: "stale-generation",
    expected: GenerationSchema.parse(expected),
    actual: GenerationSchema.parse(actual),
  };
}

function validatePreparedMutation<T>(
  prepared: PreparedMutation<T>,
  request: PreparedMutationRequest,
  scope: ScopeContext,
): PreparedMutation<T> {
  if (prepared === null || typeof prepared !== "object") throw new TypeError("prepared mutation callback must return a mutation");
  if (!isVerifiedStateMutation(prepared.mutation)) {
    throw new TypeError("prepared mutation callback must return a verified state mutation");
  }
  if (prepared.mutation.expectedGeneration !== request.expectedGeneration) {
    throw new TypeError("prepared state mutation generation does not match the request");
  }
  const mutationScope = ScopeContextSchema.parse(prepared.mutation.scope);
  if (!sameScopeContext(mutationScope, scope) || !sameScopeReference(toScopeReference(mutationScope), toScopeReference(scope))) {
    throw new TypeError("prepared state mutation scope does not match the request");
  }
  return prepared;
}

function validateCommitResult(
  result: StateCommitResult,
  request: PreparedMutationRequest,
  scope: ScopeContext,
): StateCommitResult {
  if (result === null || typeof result !== "object") throw new Error("state store returned an invalid commit result");
  if (result.kind === "stale-generation") {
    return {
      kind: "stale-generation",
      expected: GenerationSchema.parse(result.expected),
      actual: GenerationSchema.parse(result.actual),
    };
  }
  if (result.kind !== "committed") throw new Error("state store returned an unknown commit result");
  return {
    kind: "committed",
    snapshot: validateSnapshot(result.snapshot, scope),
  };
}

class Coordinator implements GenerationMutationCoordinator {
  constructor(private readonly dependencies: GenerationMutationCoordinatorDependencies) {}

  async runPreparedMutation<T>(
    request: PreparedMutationRequest,
    prepareCommit: (context: PreparedMutationContext) => Promise<PreparedMutation<T>>,
    signal: AbortSignal,
  ): Promise<GenerationMutationResult<T>> {
    assertSignal(signal);
    if (typeof prepareCommit !== "function") throw new TypeError("prepared mutation callback is required");
    const validated = validateRequest(request);
    const expectedGeneration = GenerationSchema.parse(request.expectedGeneration);

    return this.dependencies.scheduler.run(
      subjects(validated.scopeReference, validated.plugins),
      async (schedulerContext) => this.runWithKeys(
        request,
        validated.scope,
        expectedGeneration,
        prepareCommit,
        signal,
        schedulerContext,
      ),
      signal,
    );
  }

  private async runWithKeys<T>(
    request: PreparedMutationRequest,
    scope: ScopeContext,
    expectedGeneration: Generation,
    prepareCommit: (context: PreparedMutationContext) => Promise<PreparedMutation<T>>,
    signal: AbortSignal,
    schedulerContext: MutationExecutionContext,
  ): Promise<GenerationMutationResult<T>> {
    void schedulerContext;
    const scopeReference = toScopeReference(scope);
    let lease: ScopeLockLease | undefined;
    let primaryFailure: unknown;
    let failed = false;
    let committed: Readonly<{ value: T; snapshot: GenerationSnapshot }> | undefined;
    let outcome: GenerationMutationResult<T> | undefined;

    try {
      lease = await this.dependencies.locks.acquire(scopeReference, signal);
      await lease.assertOwned(signal);
      const loaded = await this.dependencies.state.read(scope, signal);
      if (!loaded.ok) throw loadFailure(loaded);
      const snapshot = validateSnapshot(loaded.snapshot, scope);
      if (snapshot.generation !== expectedGeneration) {
        outcome = staleResult(expectedGeneration, snapshot.generation);
      } else {
        await lease.assertOwned(signal);
        const prepared = validatePreparedMutation(
          await prepareCommit({
            snapshot,
            assertOwned: () => lease!.assertOwned(signal),
          }),
          request,
          scope,
        );
        await lease.assertOwned(signal);
        const commitResult = validateCommitResult(
          await this.dependencies.state.commit(prepared.mutation, signal),
          request,
          scope,
        );
        if (commitResult.kind === "stale-generation") {
          outcome = staleResult(commitResult.expected, commitResult.actual);
        } else {
          committed = { value: prepared.value, snapshot: commitResult.snapshot };
          outcome = { kind: "committed", value: prepared.value, snapshot: commitResult.snapshot };
        }
      }
    } catch (error) {
      failed = true;
      primaryFailure = error;
    }

    let cleanupFailure: unknown;
    if (lease !== undefined) {
      try {
        await lease.release();
      } catch (error) {
        cleanupFailure = error;
      }
    }

    if (cleanupFailure !== undefined) {
      if (committed !== undefined) throw new CommittedMutationCleanupError(committed, cleanupFailure);
      if (failed) throw new MutationCleanupError(primaryFailure, cleanupFailure);
      throw cleanupFailure;
    }
    if (failed) throw primaryFailure;
    if (outcome === undefined) throw new Error("prepared mutation completed without a result");
    return outcome;
  }
}

export function createGenerationMutationCoordinator(
  dependencies: GenerationMutationCoordinatorDependencies,
): GenerationMutationCoordinator {
  if (dependencies === null || typeof dependencies !== "object") throw new TypeError("generation coordinator dependencies are required");
  if (dependencies.scheduler === undefined || dependencies.locks === undefined || dependencies.state === undefined) {
    throw new TypeError("generation coordinator requires scheduler, locks, and state");
  }
  return new Coordinator(dependencies);
}
