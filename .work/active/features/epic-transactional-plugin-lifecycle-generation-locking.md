---
id: epic-transactional-plugin-lifecycle-generation-locking
kind: feature
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Generation-Safe Mutation Coordination

## Brief

Provide the concurrency contract for lifecycle mutation: in-process serialization by plugin key, cross-process scope locking, and expected-generation compare-and-commit checks around short authoritative-state transitions. Stale results from long-running materialization, inspection, trust, or network work must fail or restart rather than overwrite a newer mutation.

This feature owns coordination policy and lock/generation ports, including cancellation and abandoned-owner behavior. It does not hold locks during source or network work, define lifecycle command semantics, choose immutable storage layout, implement Pi reload, or treat a lock as proof that an external projection activated.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 safeguard — lifecycle operations require it before any compare-and-commit mutation
- Depends on state schemas for scope identities and monotonic generation records
- Required guarantees: crash, concurrency, scope, network, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — State layout; Install transaction; Performance and availability
- `docs/ARCHITECTURE.md` — State ports; Installation transaction; Concurrency

## Existing contract references

- `src/application/source-materialization.ts` — cancellable long-running work that must remain outside lifecycle locks
- `src/application/inspection-service.ts` and `src/application/compatibility-service.ts` — pre-commit work whose results may become stale

## Late-bound feature decisions

Lock-file/backend choice, lock ordering, timeout and stale-owner detection, reentrancy policy, fairness, retry surface, generation width, read snapshot token, per-plugin coordinator lifetime, and platform degradation behavior remain for feature design. It must prove no lost update across processes and no deadlock between user/project or multi-plugin operations.

## UI alignment

No UI surface.

## Discovery and design decisions

- **Discovery posture**: Direct-read only. The feature is bounded to the completed state contracts, one new application coordination boundary, and one filesystem adapter. Grounding covered the parent epic, state-schema feature, foundation concurrency/transaction assertions, state-store port and verified-mutation contract, dependency rules, cancellation/error conventions, and representative integration fakes. No exploratory agent was needed.
- **Worker capability**: Highest available capability is warranted because stale ownership and cross-process races are security- and data-integrity-sensitive. This design was completed in the current context because nested dispatch is unavailable here; design-time advisory unavailability is non-blocking under the project policy.
- **Review weight**: `standard` from the project/default policy. The implementation and feature review should escalate contract, lifecycle, and adversarial child-process tests rather than relying on line count.
- **Coordination layers**: Use two deliberately separate mechanisms. A portable in-process keyed scheduler serializes scope-qualified plugin mutations. A filesystem scope-lock adapter coordinates processes. The generation-window service composes both with `LifecycleStateStore`; neither lock implementation is folded into the authoritative store.
- **Scope-qualified plugin keys**: User and project installations of the same `PluginKey` are independent and may proceed concurrently. The scheduler key is therefore `(ScopeReference, PluginKey)`, not a bare plugin key. Multi-plugin requests sort their canonical keys before acquisition, preventing lock-order cycles.
- **Scope lock granularity**: One cross-process lease protects one complete user or project scope. State generation is scope-wide, so narrower cross-process plugin locks would not prevent two plugins from racing the same pointer generation. In-process plugin serialization still avoids needless duplicate work before the short scope window.
- **Critical-window shape**: Long-running materialization, inspection, compatibility, trust collection, and projection preparation happen before `runPreparedMutation`. The callback inside the window may perform only the already-prepared atomic promotion step and construct a verified mutation. It cannot commit directly. The coordinator asserts lease ownership and commits the returned mutation as the final callback-adjacent action, so code cannot report success after ignoring a stale commit.
- **No transaction callback on the store**: `LifecycleStateStore` remains unchanged and adapter-neutral. The callback belongs to the application coordination service, which is the correct owner for promotion-before-commit ordering. The store still receives one opaque `VerifiedStateMutation` and retains compare-and-swap authority.
- **Lease backend**: Choose a private lock-directory protocol using exclusive directory creation, strict owner metadata, heartbeat renewal, and rename-based stale takeover. The adapter is explicitly supported only on local filesystems whose capability probe demonstrates exclusive create and atomic same-directory rename. It fails closed with `BoundaryError(ADAPTER_FAILED)` when those primitives or secure permissions are unavailable; it does not overclaim NFS/network-filesystem safety.
- **Abandoned owners**: Owner metadata contains a cryptographically random lease token, process id for diagnostics only, acquisition id, and expiry. Expiry permits takeover only after the owner record is unchanged across the stale observation and atomic rename. The old owner loses because every heartbeat, pre-promotion assertion, and pre-commit assertion re-reads the canonical owner token. PID liveness is never treated as authority, avoiding PID-reuse errors.
- **Cancellation and waiting**: Caller cancellation is the only public lock-wait timeout. A cancelled queued in-process request is removed without running, and a cancelled cross-process waiter stops retrying. Once the critical window begins, the signal is still checked before promotion and commit. Abort reasons propagate unchanged when release succeeds.
- **Fairness and reentrancy**: The in-process scheduler is FIFO per canonical key. Reentrant acquisition of an already-held canonical key is rejected rather than silently succeeding or deadlocking. Cross-process acquisition uses bounded jittered polling configured by the adapter; fairness across processes is best-effort because local filesystems provide no portable fair-lock primitive.
- **Generation authority**: The current `Generation` type and `StateCommitResult` remain authoritative. The coordinator reads under the lease, compares `expectedGeneration`, skips the critical callback on mismatch, then still relies on `LifecycleStateStore.commit` as the final compare-and-swap defense. It never computes the next generation itself.
- **Failure surface**: Stale generation is returned as data. Lock loss and unsupported/failed filesystem primitives are adapter failures. If work fails and release also fails, the adapter failure carries both causes rather than hiding unsafe cleanup. A successful release never converts cancellation or callback failure.
- **Foundation timing**: No design-time foundation edit is required. `SPEC` and `ARCHITECTURE` already require scope locks, short commits, per-plugin in-process serialization, cancellation, and generation checks. Implementation rolls exact contract names forward if those assertions need clarification.

## Architectural choice

### Option A — hide all locking inside `LifecycleStateStore`

A store implementation could acquire a lock around every commit. That protects pointer publication but cannot cover immutable promotion immediately before the pending-transition commit, cannot serialize prepared plugin operations before the scope window, and would turn the deliberately small state port into a transaction callback API. Rejected.

### Option B — application mutation coordinator over explicit keyed and scope-lock ports (chosen)

A portable keyed scheduler serializes same-scope plugin operations, a `ScopeLockManager` port exposes an ownership-checkable lease, and `GenerationMutationCoordinator` composes those with `LifecycleStateStore`. Prepared work enters one short callback, returns an opaque verified mutation, and the coordinator performs the final compare-and-swap. This keeps policy inward, filesystem behavior outward, and the state store unchanged. The cost is an explicit lease protocol and careful release/error handling.

### Option C — optimistic generation retries without a cross-process lease

Every operation could read, prepare, and retry after a stale commit. This prevents lost state writes but cannot safely coordinate promotion and pending-transition publication: a losing writer may promote content or projections that no generation names. Rejected.

**Choice**: Option B. Generation compare-and-swap remains the final authority; locks narrow the side-effect window rather than replacing it.

## Trickiest unit first

The filesystem lease is the highest-risk unit. A stale owner can resume after another process takes over, so expiry alone is never proof of ownership. The protocol makes the random token in the canonical owner record authoritative and requires ownership checks immediately before promotion and commit. Takeover atomically renames the expired lock directory before creating a new canonical directory; a resumed old owner can heartbeat only after re-reading the canonical token and therefore observes loss. The adapter must stop at a capability error rather than weakening this on a filesystem that cannot provide exclusive directory creation and same-directory rename.

## Implementation units

### Unit 1: Coordination contracts and scope-qualified FIFO scheduler

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`

**Files**:
- `src/application/mutation-coordination.ts`
- `src/application/ports/scope-lock.ts`
- `src/application/keyed-mutation-scheduler.ts`
- `test/application/keyed-mutation-scheduler.test.ts`

```typescript
// src/application/ports/scope-lock.ts
export interface ScopeLockLease {
  readonly scope: ScopeReference;
  assertOwned(signal: AbortSignal): Promise<void>;
  release(): Promise<void>;
}

export interface ScopeLockManager {
  acquire(scope: ScopeReference, signal: AbortSignal): Promise<ScopeLockLease>;
}

// src/application/mutation-coordination.ts
export const MutationSubjectSchema = z.object({
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
}).strict().readonly();
export type MutationSubject = z.infer<typeof MutationSubjectSchema>;

export interface KeyedMutationScheduler {
  run<T>(
    subjects: readonly MutationSubject[],
    work: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T>;
}

export function createKeyedMutationScheduler(): KeyedMutationScheduler;
```

Canonical scheduler keys are injective length-prefixed encodings of scope kind/project key and plugin key, never ambiguous string concatenation. Requests reject duplicate subjects, acquire sorted keys, run once, and release in reverse order in `finally`. FIFO queues remove cancelled waiters and delete idle key state so the scheduler cannot grow without bound. An `AsyncLocalStorage`-free explicit ownership token passed internally detects same-request reentrancy while keeping application code free of Node dependencies.

**Acceptance criteria**:
- [ ] Same plugin and scope execute strictly one at a time in FIFO order; different plugins or different scopes may overlap.
- [ ] Multi-plugin requests with opposite caller order cannot deadlock because acquisition uses one canonical order.
- [ ] Cancellation before acquisition preserves the exact abort reason, never invokes work, and removes the waiter.
- [ ] Throwing or cancellation during work releases every key and allows the next waiter to proceed.
- [ ] Reentrant acquisition of a held key fails explicitly; duplicate subjects and malformed scopes/plugins fail fast.
- [ ] Idle queues are removed and no timer, callback, or waiter remains retained after completion.

### Unit 2: Secure local-filesystem scope lease

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-filesystem-lease`
**Depends on**: `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`

**Files**:
- `src/infrastructure/filesystem/file-scope-lock.ts`
- `src/infrastructure/filesystem/file-scope-lock-owner.ts`
- `test/infrastructure/filesystem/file-scope-lock.test.ts`
- `test/fixtures/locking/child-lock-holder.mjs`

```typescript
export type FileScopeLockOptions = Readonly<{
  lockRoot: string;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
  orphanGraceMs: number;
  retryDelayMs: Readonly<{ minimum: number; maximum: number }>;
  now?: () => number;
  randomBytes?: (size: number) => Uint8Array;
}>;

export function createFileScopeLockManager(
  options: FileScopeLockOptions,
): ScopeLockManager;
```

The adapter creates a caller-private `0700` root and one `0700` directory per scope (`user.lock` or `project-<64 lowercase hex>.lock`). The strict owner document contains only protocol version, random token, process id, acquisition id, and expiry. Owner updates use same-directory temporary files opened exclusively with no-follow protection, file sync, rename, and directory sync where supported. Acquisition uses exclusive `mkdir`; contention reads only regular owner files beneath the verified root. Missing/malformed owner metadata receives `orphanGraceMs` before rename-based quarantine. Expired takeover succeeds only if the observed owner fingerprint is unchanged when the canonical directory is renamed. Release removes a directory only after matching its token; it is idempotent for the owner and cannot remove a successor's lease.

A startup capability probe exercises exclusive creation, owner replacement, and same-directory rename in a disposable child. Unsupported/network filesystem behavior fails closed. Heartbeats stop in `release`; heartbeat failure marks the lease lost and makes all future `assertOwned` calls fail. No lock path, owner token, native error, or physical root enters authoritative state or public diagnostics.

**Acceptance criteria**:
- [ ] Two independent Node processes cannot simultaneously hold the same scope lease; user and distinct project scopes can overlap.
- [ ] A crashed child becomes reclaimable only after expiry/grace, and a resumed or delayed old owner fails `assertOwned` without deleting the successor.
- [ ] Competing stale reclaimers produce one winner through atomic rename/create; malformed or symlinked lock artifacts fail closed.
- [ ] Heartbeat keeps a live lease from expiring, stops after release, and marks ownership lost on renewal failure.
- [ ] Aborted acquisition preserves the abort reason and leaves no candidate/tombstone directory owned by the waiter.
- [ ] Adapter errors are redacted `BoundaryError(ADAPTER_FAILED)` values; release is idempotent and token-checked.
- [ ] Capability failure on unsupported primitives prevents lifecycle mutation rather than degrading to process-local locking.

### Unit 3: Generation-guarded prepared mutation window

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-guarded-window`
**Depends on**: `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`

**Files**:
- `src/application/generation-mutation-coordinator.ts`
- `test/application/generation-mutation-coordinator.test.ts`

```typescript
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

export interface GenerationMutationCoordinator {
  runPreparedMutation<T>(
    request: PreparedMutationRequest,
    prepareCommit: (context: PreparedMutationContext) => Promise<PreparedMutation<T>>,
    signal: AbortSignal,
  ): Promise<GenerationMutationResult<T>>;
}

export function createGenerationMutationCoordinator(dependencies: Readonly<{
  scheduler: KeyedMutationScheduler;
  locks: ScopeLockManager;
  state: LifecycleStateStore;
}>): GenerationMutationCoordinator;
```

Execution order is fixed: validate request; acquire scope-qualified plugin keys; acquire scope lease; read and validate the current snapshot; return stale without invoking `prepareCommit` when generations differ; assert ownership; invoke the already-prepared critical callback; verify the returned opaque mutation belongs to the exact scope and expected generation; assert ownership again; commit through the store; and release in `finally`. A stale result from the store becomes the outer stale result, never a successful callback value. The callback cannot commit and no callback runs after commit, preventing success-after-stale and post-commit side effects.

An empty plugin list is allowed only for scope-level configuration mutations and still takes the scope lease. Duplicate plugin keys fail. Scope equality uses parsed `ScopeContext`/`ScopeReference`, not object identity. Cancellation is checked before each acquisition, callback invocation, and commit; release semantics follow the design decisions above.

**Acceptance criteria**:
- [ ] Long-running caller preparation can occur before the API; only the supplied critical callback runs under the scope lease.
- [ ] A stale initial generation skips promotion/callback and returns the exact expected/actual generations.
- [ ] The coordinator rejects unverified, wrong-scope, wrong-generation, duplicate-plugin, and callback-omitted mutations before store commit.
- [ ] Lease loss before promotion or commit prevents the store call; the state store's own compare-and-swap remains the final race defense.
- [ ] A store stale result cannot be ignored or converted to committed success.
- [ ] Success invokes the callback and store exactly once, returns the committed snapshot, and releases plugin/scope ownership.
- [ ] Abort and adapter/callback/release failure paths preserve the documented error and cleanup behavior.

### Unit 4: Process-level integration, boundaries, and public contract

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-contract-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-generation-locking-filesystem-lease`, `epic-transactional-plugin-lifecycle-generation-locking-guarded-window`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/generation-locking.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md` and `docs/ARCHITECTURE.md` only where exact landed names clarify current assertions

The package exports the portable coordination contracts, scheduler/coordinator factories, and lifecycle-facing `ScopeLockManager` port. The concrete filesystem lock factory remains a deliberate Node composition surface only if the package's existing factory policy requires direct wiring; owner protocol helpers, lock paths, tokens, heartbeat machinery, stale tombstones, and native filesystem errors are never public. Dependency rules keep scheduler/coordinator code free of Node and outer layers and ensure only infrastructure implements the lock port.

Integration tests use real child processes plus a fake `LifecycleStateStore` to force overlapping same-generation writers. Exactly one prepared mutation commits; the loser observes stale before its callback or at the store compare-and-swap defense. Separate scopes and plugin keys demonstrate permitted concurrency. Public and compiled allowlists prove no physical lock or owner internals escape.

**Acceptance criteria**:
- [ ] Child-process contention proves mutual exclusion, stale-owner recovery, cancellation, and no lost update against a shared scope.
- [ ] Same-generation competing operations produce one commit and one typed stale result; a losing operation cannot report promoted/committed success.
- [ ] User/project and unrelated-plugin tests prove only required work is serialized.
- [ ] Source and compiled API allowlists expose coordination contracts without lock paths, owner tokens, timers, or filesystem protocol internals.
- [ ] Dependency rules reject application-to-Node/infrastructure imports and non-infrastructure lock-port implementations.
- [ ] `npm test` includes strict production/test typecheck, unit/integration/child-process tests, boundaries, build, and compiled import.
- [ ] Foundation docs describe the landed coordination boundary without claiming network-filesystem or lock fairness guarantees.

## Implementation order

1. `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`
2. In parallel after Unit 1:
   - `epic-transactional-plugin-lifecycle-generation-locking-filesystem-lease`
   - `epic-transactional-plugin-lifecycle-generation-locking-guarded-window`
3. `epic-transactional-plugin-lifecycle-generation-locking-contract-hardening`

The scheduler/port story establishes canonical ownership semantics. The filesystem adapter and application generation window then proceed independently against those contracts. Contract hardening converges them with actual multi-process races and package boundaries.

## Testing

- **Scheduler model tests**: deterministic deferred promises exercise FIFO order, sorted multi-key acquisition, overlap for unrelated subjects, cancellation at every queue position, exception release, reentrancy rejection, and queue-map cleanup.
- **Lease protocol tests**: temporary private roots cover owner schema, exclusive acquisition, heartbeat, malformed/symlink artifacts, token mismatch, stale rename races, orphan grace, release idempotency, and injected clock/random failures.
- **Child-process tests**: one holder and multiple contenders use IPC barriers rather than timing-only sleeps. Cases cover live exclusion, crash recovery, simultaneous stale takeover, abort while waiting, and independent scopes.
- **Generation service tests**: fakes record exact call order and lock state during read/callback/commit. Tests force stale-before-callback, lock loss, forged mutation, wrong scope/generation, store-level stale, callback failure, release failure, and abort propagation.
- **Integration tests**: competing prepared mutations against a shared fake durable state prove one generation increment and no lost update. Promotion is represented by an idempotent fake whose event log proves it runs only inside an owned lease and never for an already-stale request.
- **Architecture/public tests**: dependency-cruiser canaries and exact source/compiled exports prove application portability and prevent owner/path internals from becoming contracts.

## Risks

- **Riskiest assumption — lock-directory primitives are trustworthy on every target filesystem**: they are not. The adapter supports only local filesystems that pass its capability checks and documents the limit. A future advisory-lock or database adapter can implement the same `ScopeLockManager` port without changing application policy.
- **Lease expiry can overlap a paused process**: expiry never grants the old owner authority. Random-token ownership checks immediately before promotion and commit make a resumed owner fail. Side effects performed before a final ownership check must be immutable/idempotent; mutable activation remains in the later operations/recovery design.
- **Release failure after successful commit is ambiguous**: committed state remains authoritative. The coordinator returns/throws an explicit adapter failure carrying commit evidence rather than retrying the mutation. Recovery can inspect generation; it must not blindly replay.
- **Generic callbacks can hide long work**: the API names the callback `prepareCommit`, passes only the locked snapshot/ownership assertion, and requires a verified mutation result. Tests enforce order, while operations design must keep acquisition/network/trust work outside. A hard runtime duration cap is avoided because pausing does not imply unsafe ownership while heartbeats and token checks remain valid.
- **Scope-wide locks reduce cross-process concurrency**: the state pointer generation is scope-wide, so this serialization is required for correctness. Downloads and inspection remain concurrent outside the window; changing to per-document generations would be a state-schema version change, not a lock optimization.
- **Least certainty — platform durability details**: file and directory sync support differs. The adapter must state which owner-record guarantees are coordination-only versus durable. If safe atomic replacement cannot be demonstrated, it fails capability setup rather than pretending heartbeat ownership is reliable.

## Pre-mortem

This feature fails if two processes both believe they own one scope, a cancelled waiter later runs, opposite multi-plugin requests deadlock, a stale generation performs promotion, or release cleanup deletes a successor's lock. The design counters those failures with token-verified leases, cancellable FIFO queues, sorted canonical keys, generation comparison before callback plus store-level compare-and-swap, and token-checked release.

The least recoverable failure is committing after lease ownership moved to another process. The coordinator therefore checks ownership immediately before the store call and still requires the store to reject a stale generation. If the filesystem adapter cannot make ownership assertions reliable, implementation stops at a capability error; it does not fall back to in-process-only safety.
