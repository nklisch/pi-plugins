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

- **Discovery posture**: Direct-read only. The feature is bounded to the completed state contracts, one new application coordination boundary, and one local SQLite locking adapter. Grounding covered the parent epic, state-schema feature, foundation concurrency/transaction assertions, state-store port and verified-mutation contract, dependency rules, cancellation/error conventions, Node 24's actual `node:sqlite` transaction/error surface, and representative integration fakes. No exploratory agent was needed.
- **Worker capability**: Highest available capability is warranted because stale ownership and cross-process races are security- and data-integrity-sensitive. This design was completed in the current context because nested dispatch is unavailable here; design-time advisory unavailability is non-blocking under the project policy.
- **Review weight**: `standard` from the project/default policy. The implementation and feature review should escalate contract, lifecycle, and adversarial child-process tests rather than relying on line count.
- **Coordination layers**: Use two deliberately separate mechanisms. A portable in-process keyed scheduler serializes scope-qualified plugin mutations. A local SQLite scope-lock adapter coordinates processes. The generation-window service composes both with `LifecycleStateStore`; locking is not folded into authoritative state.
- **Scope-qualified plugin keys**: User and project installations of the same `PluginKey` are independent and may proceed concurrently. The scheduler key is therefore `(ScopeReference, PluginKey)`, not a bare plugin key. Multi-plugin requests sort their canonical keys before acquisition, preventing lock-order cycles.
- **Scope lock granularity**: One cross-process transaction protects one complete user or project scope. State generation is scope-wide, so narrower cross-process plugin locks would not prevent two plugins from racing the same pointer generation. In-process plugin serialization still avoids needless duplicate work before the short scope window.
- **Critical-window shape**: Long-running materialization, inspection, compatibility, trust collection, and projection preparation happen before `runPreparedMutation`. The callback inside the window may perform only the already-prepared atomic promotion step and construct a verified mutation. It cannot commit directly. The coordinator checks transaction ownership and commits the returned mutation as the final callback-adjacent action, so code cannot report success after ignoring a stale commit.
- **No transaction callback on the store**: `LifecycleStateStore` remains unchanged and adapter-neutral. The callback belongs to the application coordination service, which is the correct owner for promotion-before-commit ordering. The store still receives one opaque `VerifiedStateMutation` and retains compare-and-swap authority.
- **Lock backend**: Use one private SQLite database per scope and hold `BEGIN IMMEDIATE` for the short mutation window. Node 24 already supplies `node:sqlite`; the operating system releases SQLite's file lock when a connection/process terminates, so abandoned owners need no expiry, PID test, heartbeat, or unsafe stale-lease takeover. The adapter uses rollback-journal mode, a zero SQLite busy timeout, and cancellable application-level retry. It supports only capability-probed local filesystems and fails closed with `BoundaryError(ADAPTER_FAILED)` on unknown/network filesystems or failed lock probes.
- **Why not an expiring file lease**: A paused owner can resume after expiry, and ownership-check-then-commit is not atomic with takeover. Without a fencing token consumed atomically by `LifecycleStateStore.commit`, heartbeat/rename leases cannot prove mutual exclusion. Generation compare-and-swap prevents lost writes but cannot decide that the newer lease holder must win. The design therefore uses a crash-released kernel lock and has no stale-owner timeout.
- **Cancellation and waiting**: Caller cancellation (including a caller-created deadline signal) is the only public wait timeout. SQLite receives `timeout: 0`; `SQLITE_BUSY` (`errcode: 5`) triggers bounded jittered retries that stop immediately on abort. A cancelled in-process waiter is removed without running. After acquisition, cancellation is checked before the critical callback and before commit; release still runs. Abort reasons propagate unchanged when release succeeds.
- **Fairness and reentrancy**: The in-process scheduler is FIFO per canonical key. Cross-process fairness is best-effort because SQLite/OS file locks do not promise queue order. Scheduler callbacks receive an explicit execution context for supported nested acquisition; overlap with a key already held by that context fails fast, while disjoint nested keys acquire in canonical order. Calling the scheduler recursively without the supplied context is an API precondition violation and is excluded from application composition.
- **Lock ordering and scope shape**: One coordinator request belongs to exactly one validated scope. It acquires sorted scope-qualified plugin keys first and that scope's SQLite lock second, then releases in reverse. Cross-scope requests are rejected and must be split by the lifecycle layer, so no operation can hold user and project scope locks together. An empty plugin list is the explicit scope-level mutation form.
- **Generation authority**: The current safe-integer `Generation`, opaque `VerifiedStateMutation`, and `StateCommitResult` remain authoritative. The coordinator reads under the database lock, compares `expectedGeneration`, skips the callback on mismatch, and relies on `LifecycleStateStore.commit` as the final compare-and-swap defense. It never computes the next generation or invents a second snapshot token.
- **Failure surface**: Stale generation is returned as data. Lock setup/acquisition/release and unsupported filesystem failures are redacted adapter errors. If work and release both fail, a cleanup error retains both native causes; exact abort/callback identity is promised only when release succeeds. If commit succeeds but release fails, `CommittedMutationCleanupError` carries the committed value/snapshot and cleanup cause so callers must not retry blindly.
- **Foundation timing**: No design-time foundation edit is required. `SPEC` and `ARCHITECTURE` already require scope locks, short commits, per-plugin in-process serialization, cancellation, and generation checks. Implementation rolls exact contract names forward if those assertions need clarification.

## Architectural choice

### Option A — hide all locking inside `LifecycleStateStore`

A store implementation could acquire a lock around every commit. That protects pointer publication but cannot cover immutable promotion immediately before the pending-transition commit, cannot serialize prepared plugin operations before the scope window, and would turn the deliberately small state port into a transaction callback API. Rejected.

### Option B — application mutation coordinator over explicit keyed and scope-lock ports (chosen)

A portable keyed scheduler serializes same-scope plugin operations, a `ScopeLockManager` port exposes an ownership-checkable lease, and `GenerationMutationCoordinator` composes those with `LifecycleStateStore`. Prepared work enters one short callback, returns an opaque verified mutation, and the coordinator performs the final compare-and-swap. This keeps policy inward, SQLite/filesystem behavior outward, and the state store unchanged. The cost is an isolated Node adapter and careful transaction cleanup/error handling.

### Option C — expiring lock-directory lease or optimistic generation retries

A heartbeat/rename lease appears dependency-free, while generation-only retries prevent lost state writes. Neither gives the required critical-window ownership: a paused lease owner can pass an ownership check, lose an expired lease, resume, and commit before the replacement owner. Generation compare-and-swap chooses whichever commit arrives first, not the current lease owner. Fencing would require changing the completed state-store contract. Rejected.

**Choice**: Option B, implemented by an OS-backed SQLite write transaction. Generation compare-and-swap remains the final state authority; the non-expiring process lock protects the adjacent promotion window and is automatically abandoned on process death.

## Trickiest unit first

The SQLite scope lock is the highest-risk unit because a false portability claim would invalidate every higher-level guarantee. Acquisition opens one scope-specific database with extension loading disabled and zero busy timeout, verifies protocol metadata, and attempts `BEGIN IMMEDIATE`; only numeric SQLite busy code 5 is retryable. The held connection is the ownership capability. There is no owner file, heartbeat, PID, expiry, or stale takeover. Process termination lets the OS/SQLite release the lock; a merely paused live process remains owner, which is the only safe abandoned-owner distinction without store-level fencing. Setup must reject symlinks, insecure roots, unknown/network filesystem types, protocol mismatch, and a failed real two-connection exclusion probe rather than degrade to process-local locking.

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

Canonical scheduler keys are injective length-prefixed encodings of scope kind/project key and plugin key, never ambiguous string concatenation. A request contains one scope only, rejects duplicate subjects, acquires sorted keys, runs once, and releases in reverse order in `finally`. FIFO queues remove cancelled waiters and delete idle key state so the scheduler cannot grow without bound. The shipped scheduler callback has no recursive-acquisition capability; nested scheduling was removed because no lifecycle composition requires it and exposing it could admit a head-of-line deadlock.

**Acceptance criteria**:
- [ ] Same plugin and scope execute strictly one at a time in FIFO order; different plugins or different scopes may overlap.
- [ ] Multi-plugin requests with opposite caller order cannot deadlock because acquisition uses one canonical order.
- [ ] Cancellation before acquisition preserves the exact abort reason, never invokes work, and removes the waiter.
- [ ] Throwing or cancellation during work releases every key and allows the next waiter to proceed.
- [ ] Cross-scope, duplicate-subject, and malformed scope/plugin requests fail fast; no supported callback API admits nested scheduler acquisition.
- [ ] Idle queues are removed and no timer, callback, or waiter remains retained after completion.

### Unit 2: Crash-released SQLite scope lock

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock`
**Depends on**: `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`

**Files**:
- `src/infrastructure/state/sqlite-scope-lock.ts`
- `src/infrastructure/state/local-lock-filesystem.ts`
- `test/infrastructure/state/sqlite-scope-lock.test.ts`
- `test/fixtures/locking/child-lock-holder.mjs`

```typescript
export type SqliteScopeLockOptions = Readonly<{
  lockRoot: string;
  retryDelayMs: Readonly<{ minimum: number; maximum: number }>;
  random?: () => number;
  verifyLocalFilesystem?: (root: string) => Promise<void>;
}>;

export function createSqliteScopeLockManager(
  options: SqliteScopeLockOptions,
): Promise<ScopeLockManager>;
```

Initialization verifies or creates a caller-private `0700` root without following symlinks, runs the injected/platform local-filesystem policy, and performs a disposable two-connection exclusion/crash-release probe. Unknown or network filesystems fail closed unless the composition root supplies a stricter supported probe. Each validated scope maps to a fixed filename (`user.sqlite` or `project-<64 lowercase hex>.sqlite`) beneath that root. The database stores only a strict protocol/version row; it never stores lifecycle state, owner identity, paths, generations, or mutation data.

Acquisition opens `DatabaseSync` with extensions disabled, defensive mode enabled, and `timeout: 0`; validates the protocol; and attempts `BEGIN IMMEDIATE`. Only SQLite `errcode === 5` is contention. Contention closes that connection and retries after an abort-aware bounded jitter delay. Any other open/pragma/schema/transaction error is `BoundaryError(ADAPTER_FAILED)`. A lease owns the live connection and transaction. `assertOwned` verifies the local lease state and abort signal; ownership cannot expire while the process is paused. `release` executes `ROLLBACK` and always attempts `close`; it is idempotent after demonstrated close. Process exit/crash releases the OS lock automatically, so there are no stale artifacts to steal and no PID-reuse problem.

The adapter uses rollback-journal mode and one database per scope; it does not use WAL, shared cache, a blocking SQLite busy timeout, extension loading, or SQL supplied by callers. Lock filenames and native SQLite errors remain private. SQLite is a locking adapter here, not a second authoritative state store.

**Acceptance criteria**:
- [ ] Two independent Node processes cannot simultaneously hold one scope transaction; user and distinct project databases can overlap.
- [ ] A killed/crashed holder becomes immediately acquirable through OS lock release, while a paused live owner never expires.
- [ ] Aborted acquisition preserves the exact abort reason, closes every contender connection, and leaves no retry timer.
- [ ] Only numeric SQLite busy code 5 retries; corrupt protocol, symlink/insecure root, unknown/network filesystem, and all other SQLite failures fail closed.
- [ ] Release rolls back and closes in `finally`, is idempotent after success, and reports uncertain cleanup without hiding an already committed mutation.
- [ ] No lifecycle state, generation, owner/PID/token, physical path, or native error enters the database contract or public diagnostics.
- [ ] Capability failure prevents lifecycle mutation rather than degrading to process-local locking.

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

export class CommittedMutationCleanupError<T> extends Error {
  readonly committed: Readonly<{ value: T; snapshot: GenerationSnapshot }>;
  override readonly cause: unknown;
}

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

Execution order is fixed: validate request and its one-scope plugin set; acquire scope-qualified plugin keys; acquire the scope transaction; read and validate the current snapshot; return stale without invoking `prepareCommit` when generations differ; check cancellation/ownership; invoke the already-prepared critical callback; require `isVerifiedStateMutation` and verify its exact scope/expected generation; check cancellation/ownership again; commit through the store; and release in `finally`. A stale result from the store becomes the outer stale result, never a successful callback value. The callback cannot commit and no callback runs after commit, preventing success-after-stale and post-commit side effects.

Release after an uncommitted stale/error path follows normal cleanup rules; work plus release failure carries both causes. After a committed store result, release failure throws `CommittedMutationCleanupError` containing the committed value and snapshot. This makes the durable outcome explicit and forbids a blind retry even though lock cleanup is uncertain.

An empty plugin list is allowed only for scope-level configuration mutations and still takes the scope lease. Duplicate plugin keys fail. Scope equality uses parsed `ScopeContext`/`ScopeReference`, not object identity. Cancellation is checked before each acquisition, callback invocation, and commit; release semantics follow the design decisions above.

**Acceptance criteria**:
- [ ] Long-running caller preparation can occur before the API; only the supplied critical callback runs under the scope lease.
- [ ] A stale initial generation skips promotion/callback and returns the exact expected/actual generations.
- [ ] The coordinator rejects unverified, wrong-scope, wrong-generation, duplicate-plugin, and callback-omitted mutations before store commit.
- [ ] Aborted/released local ownership before promotion or commit prevents the store call; the held SQLite transaction cannot expire, and the state store's compare-and-swap remains the final race defense.
- [ ] A store stale result cannot be ignored or converted to committed success.
- [ ] Success invokes the callback and store exactly once, returns the committed snapshot, and releases plugin/scope ownership.
- [ ] Abort and adapter/callback/release failure paths preserve the documented error and cleanup behavior.

### Unit 4: Process-level integration, boundaries, and public contract

**Story**: `epic-transactional-plugin-lifecycle-generation-locking-contract-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock`, `epic-transactional-plugin-lifecycle-generation-locking-guarded-window`

**Files**:
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/generation-locking.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md` and `docs/ARCHITECTURE.md` only where exact landed names clarify current assertions

The package exports the portable coordination contracts, scheduler/coordinator factories, and lifecycle-facing `ScopeLockManager` port. The concrete SQLite lock factory remains a deliberate Node composition surface only if the package's existing factory policy requires direct wiring; database paths/connections, protocol SQL, retry machinery, and native SQLite/filesystem errors are never public. Dependency rules keep scheduler/coordinator code free of Node and outer layers and ensure only infrastructure implements the lock port.

Integration tests use real child processes plus a fake `LifecycleStateStore` to force overlapping same-generation writers. Exactly one process enters the scope window at a time; after the winner commits and releases, the loser observes stale before its callback. A separate adversarial fake forces a store-level stale response to prove compare-and-swap remains authoritative. Killed-holder tests prove automatic lock release without expiry. Separate scopes and plugin keys demonstrate permitted concurrency. Public and compiled allowlists prove no SQLite path, connection, retry, or protocol internals escape.

**Acceptance criteria**:
- [ ] Child-process contention proves mutual exclusion, crash-owner release, pause-without-expiry, cancellation, and no lost update against a shared scope.
- [ ] Same-generation competing operations produce one commit and one typed stale result; a losing operation cannot report promoted/committed success.
- [ ] User/project and unrelated-plugin tests prove only required work is serialized.
- [ ] Source and compiled API allowlists expose coordination contracts without database paths, connections, retry timers, or SQLite protocol internals.
- [ ] Dependency rules reject application-to-Node/infrastructure imports and non-infrastructure lock-port implementations.
- [ ] `npm test` includes strict production/test typecheck, unit/integration/child-process tests, boundaries, build, and compiled import.
- [ ] Foundation docs describe the landed SQLite/local-filesystem coordination boundary without claiming network-filesystem, timeout, or fairness guarantees.

## Implementation order

1. `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`
2. In parallel after Unit 1:
   - `epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock`
   - `epic-transactional-plugin-lifecycle-generation-locking-guarded-window`
3. `epic-transactional-plugin-lifecycle-generation-locking-contract-hardening`

The scheduler/port story establishes canonical ownership semantics. The SQLite adapter and application generation window then proceed independently against those contracts. Contract hardening converges them with actual multi-process races and package boundaries.

## Testing

- **Scheduler model tests**: deterministic deferred promises exercise FIFO order, sorted multi-key acquisition, overlap for unrelated subjects, cross-scope rejection, cancellation at every queue position, exception release, nested held-key/order rejection, and queue-map cleanup.
- **SQLite lock tests**: temporary private roots cover protocol initialization, one-database-per-scope naming, two-connection exclusion, numeric busy classification, malformed/symlink roots, unsupported filesystem probes, rollback/close failure, release idempotency, and injected retry jitter.
- **Child-process tests**: one holder and multiple contenders use IPC barriers rather than timing-only sleeps. Cases cover live exclusion, a deliberately paused holder that does not expire, SIGKILL/crash release, abort while waiting, and independent scopes.
- **Generation service tests**: fakes record exact call order and lock state during read/callback/commit. Tests force stale-before-callback, locally released ownership, forged mutation, wrong scope/generation, store-level stale, callback failure, post-commit release failure, combined work/release failure, and abort propagation.
- **Integration tests**: competing prepared mutations against a shared fake durable state prove one generation increment and no lost update. Promotion is represented by an idempotent fake whose event log proves it runs only inside an owned scope transaction and never for an already-stale request.
- **Architecture/public tests**: dependency-cruiser canaries and exact source/compiled exports prove application portability and prevent SQLite/path internals from becoming contracts.

## Risks

- **Riskiest assumption — SQLite locking is trustworthy on every target filesystem**: it is not. The adapter supports only capability-probed local filesystems and documents the limit; unknown/network filesystems fail closed. A future OS-advisory-lock or transactional-database adapter can implement the same `ScopeLockManager` port without changing application policy.
- **`node:sqlite` remains experimental in Node 24 typings**: the project already pins Node 24+, but API stability is a packaging risk. The adapter is isolated behind `ScopeLockManager`, tests the exact constructor/error/transaction behavior, and can be replaced without changing coordination policy. If project release policy forbids experimental core APIs, implementation must stop and substitute a maintained SQLite/advisory-lock dependency rather than revive expiring leases.
- **A live process can pause indefinitely while holding the lock**: this is intentional. Safety wins over availability because no fencing token exists in the state-store commit contract. Operators can terminate the owner; process death releases the OS lock. A future bounded lease requires a store-level monotonic fencing token and is not an adapter-only change.
- **Release failure after successful commit is ambiguous unless typed**: committed state remains authoritative. `CommittedMutationCleanupError` carries commit evidence so callers inspect/recover and never blindly replay.
- **Generic callbacks can hide long work**: the API names the callback `prepareCommit`, passes only the locked snapshot/ownership assertion, and requires a verified mutation result. Tests enforce order, while operations design must keep acquisition/network/trust work outside. A hard runtime duration cap is avoided because timing out cannot safely revoke a live owner without fencing; implementation should record callback duration for diagnostics rather than weaken ownership.
- **Scope-wide locks reduce cross-process concurrency**: the state pointer generation is scope-wide, so this serialization is required for correctness. Downloads and inspection remain concurrent outside the window; changing to per-document generations would be a state-schema version change, not a lock optimization.
- **Least certainty — local-filesystem detection across platforms**: no universal filesystem classifier exists. The default probe must be conservative and platform-tested; composition may inject a stricter allowlist probe. If locality and two-connection exclusion cannot be demonstrated, setup fails rather than treating SQLite success on an unknown mount as proof.

## Pre-mortem

This feature fails if two processes enter one scope window, a cancelled waiter later runs, user/project or opposite multi-plugin requests deadlock, a stale generation performs promotion, or a successful commit is retried after cleanup failure. The design counters those failures with an OS-released SQLite write transaction, cancellable FIFO/retry queues, one-scope requests and sorted canonical keys, generation comparison before callback plus store-level compare-and-swap, and typed committed-cleanup failure.

The least recoverable failure is treating an expiring lease's last ownership check as atomic with state commit. This revision removes that unsafe premise: a live SQLite transaction does not expire, and process death releases it. If the adapter cannot prove local SQLite exclusion, implementation stops at a capability error; it does not use heartbeat takeover or fall back to in-process-only safety.

## Implementation summary

All four child stories were implemented in dependency order and advanced from `implementing` to `review`:

1. `epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler` — portable scope-lock/mutation contracts and scope-qualified FIFO scheduler with canonical multi-key order, cancellation cleanup, and explicit nested context.
2. `epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock` — private-root capability checks, one rollback-journal SQLite database per scope, `BEGIN IMMEDIATE`, numeric busy-code retry, abort-aware jitter, protocol validation, crash release, and redacted adapter failures.
3. `epic-transactional-plugin-lifecycle-generation-locking-guarded-window` — generation-guarded prepared mutation coordinator composing scheduler, scope lease, and opaque verified state commit with typed cleanup evidence.
4. `epic-transactional-plugin-lifecycle-generation-locking-contract-hardening` — real SQLite-backed competing-writer integration, child-process kill/cancellation coverage, source/compiled API allowlists, dependency canaries, and rolled-forward foundation assertions.

Implementation commits:
- `f33dc4a` — `implement: epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler`
- `6e51db0` — `implement: epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock`
- `ac85767` — `implement: epic-transactional-plugin-lifecycle-generation-locking-guarded-window`
- `8403add` — `implement: epic-transactional-plugin-lifecycle-generation-locking-contract-hardening`

Verification: full `npm test` passed with strict production typecheck, dependency boundaries, 80 Vitest files / 478 tests and no type errors, build, and compiled package import (298 exports).

## Review findings

Deep review found a supported nested scheduler deadlock, missing real cross-process no-lost-update evidence, database-path replacement split ownership, ambiguous commit completion that loses committed evidence, and unvalidated store scope/generation responses. `epic-transactional-plugin-lifecycle-generation-locking-review-hardening` tracks all accepted findings.

## Review-hardening implementation summary

The review-hardening story is done and independently verified; this feature returns to `stage: review`. The public scheduler now accepts a callback with no recursive-acquisition capability, removing the reproduced head-of-line deadlock rather than preserving an unused nested API. SQLite initialization binds a durable root marker and per-database device/inode marker, verifies identity before and during ownership, and fails closed on missing, mismatched, or replaced paths. The coordinator validates exact load/commit scope and generation contracts, requires expected-generation-plus-one committed snapshots, and reconciles commit errors or cancellation under the held lock into committed, explicit failure, or explicit ambiguity outcomes.

The integration harness launches two real Node processes through the source loader, exercises the real coordinator and SQLite transaction against shared generation authority, and covers contention, pause/cancellation, and crash release. Final adversarial review nevertheless reproduced five adjacent gaps: closure-based recursive acquisition deadlock, stranded crash initializer, incomplete snapshot/false-commit acceptance, an open/begin/path-marker replacement window, and loss of durable-outcome classification when release also fails. `epic-transactional-plugin-lifecycle-generation-locking-review-hardening-2` closes all five and is advanced to `stage: review`; the parent feature remains at `stage: implementing` pending its review lane.

## Review-hardening-2 implementation summary

The second hardening pass is implemented and handed to review without advancing the parent. Recursive closure acquisition now carries held keys through a Node `AsyncLocalStorage` adapter and rejects overlap with a fixed typed error. Lazy SQLite initialization publishes owner PID/start-time markers and atomically linked claims, reclaims only proven-dead owners, and remains cancellable for live or unknown ownership. The coordinator validates complete user/project snapshots and reconciles against the exact expected document evidence from the pre-commit snapshot, preventing unrelated `expected + 1` false success. Each SQLite lease opens through a private hard-link alias bound to the durable inode and rereads marker/path identity before and during ownership. Cleanup composition retains commit-failed/ambiguous outcomes and observed snapshots when release fails.

Exact closure, initializer kill/live-cancellation, malformed snapshot, unrelated advance, marker/path replacement, crash release, and release-after-ambiguity reproducers were added. Independent verification passes 90 Vitest files / 530 tests, strict production/test typechecking, clean dependency boundaries, build, and exact 319-export package import.

## Complementary review finding

Phase-1 GLM review reproduced an intermittent two-process first-initialization TOCTOU: stale `marker === undefined` evidence combined with a newly published database was treated as fatal instead of retried. All other review dimensions passed. `epic-transactional-plugin-lifecycle-generation-locking-review-hardening-3` owns the bounded fix; the feature returns to `stage: implementing`. Adversarial phase is deferred until complementary review clears.

## Review-hardening-3 implementation summary

The first-use TOCTOU fix is implemented and the story is advanced to `stage: review`; this parent feature remains `stage: implementing` as requested. SQLite initialization now treats a marker-absent/database-present observation as stale evidence, retries through the caller's cancellable loop, and fails closed when the same coherent orphan state persists. Live, unknown, and proven-dead initializer handling plus replacement/tamper checks remain unchanged. A marker-read scheduling seam deterministically forces winner publication between the stale marker read and database observation, and the real child-process integration repeats first-use contention 20 times with one committed result, one stale result, and zero adapter failures. That stress also found a concurrent root identity marker partial-write race; complete temporary-file plus exclusive hard-link publication closes it without changing the root identity contract.

Verification: `npm test` passed with strict production/test typechecking, dependency boundaries, 90 Vitest files / 541 tests, build, and compiled package import (319 exports).
