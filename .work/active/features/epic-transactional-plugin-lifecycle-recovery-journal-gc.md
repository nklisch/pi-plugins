---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc
kind: feature
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Recovery Journal and Revision Collection

## Brief

Record enough durable pending-transition evidence to determine whether an interrupted lifecycle operation should finalize the candidate or restore the previous active revision. Startup recovery removes abandoned staging, inspects exact generation/revision/projection evidence, isolates corrupt records, and reuses lifecycle invariants rather than creating a second mutation engine.

Retain inactive immutable revisions while active state, pending transitions, or existing-session grace policy may reference them, then collect only unreferenced expired content. Persistent plugin data remains outside collection and is never deleted as revision garbage. This feature does not perform network refresh, runtime component execution, UI reporting, or redefine lifecycle command semantics.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 4 resilience — update policy depends on its interruption and retention guarantees
- Depends on lifecycle operations so replay/compensation shares one transaction contract
- Required guarantees: crash, concurrency, scope, data, and ports guarantees plus reload verification seams in the parent epic

## Foundation references

- `docs/SPEC.md` — Install transaction; State layout; Performance and availability
- `docs/ARCHITECTURE.md` — Installation transaction; Revision retention and recovery

## Existing contract references

- `src/domain/content-manifest.ts` — immutable content evidence
- `src/domain/errors.ts` — stable diagnostic/error conventions

## Late-bound feature decisions

Journal schema/version, write-ahead sequence, fsync and atomicity protocol, recovery status machine, indeterminate reload handling, quarantine strategy, startup time budget, session-liveness evidence, grace period, collection traversal, retry/backoff, and corruption diagnostics remain for feature design. Collection must be reference-driven and idempotent; uncertain evidence retains content and reports rather than guessing.

## UI alignment

No UI surface. Recovery status is exposed as typed results for later presentation.

## Design decisions

- **Discovery posture**: Direct-read only, as required by the delegated endpoint boundary. Grounding covered all foundation and compatibility documents, project rules, the completed state/locking/store/operations feature records, lifecycle contracts and service, generation coordinator, immutable-content and projection adapters, state records/references, configuration cleanup, and representative application/integration/filesystem tests. No nested agent or peer mechanism was used.
- **Recovery is not replay**: Startup never calls `install`, `update`, materialization, inspection, compatibility, trust, configuration collection, promotion, or an operation-specific command. It reconciles only a previously durable `LifecycleTransitionRecord` against current authoritative state and exact runtime observation.
- **One transition reconciler**: Extract the existing pending-record finalization, target-preserving generation rebase, previous-state compensation, reload, and exact observation comparison from `plugin-lifecycle-service.ts` into one internal `LifecycleTransitionReconciler`. Ordinary operations call it immediately after their first commit; startup recovery calls the same methods after classifying durable evidence. There is no second mutation grammar or recovery-only state writer.
- **Journal shape**: Finalize the pre-release version-1 transition record with both `candidateProjection` and `previousProjection`. Previous/candidate/final installed states remain pending-free, and the record retains no paths, secrets, expanded configuration, native errors, or process identifiers. The opaque reference continues to derive only from operation id, scope/plugin, and starting generation.
- **Write-ahead sequence**: Transition preparation is durably committed before the first authoritative state commit. Journal state then moves `prepared → recovery-required → completed|rolled-back`, or `prepared → completed|rolled-back`; an unreferenced pre-commit record may become `abandoned` only after its owner is proven dead and its grace expires. `recovery-required` is resumable, not terminal. Terminal states never change to another terminal state.
- **Separate durable database**: Implement one private rollback-journal SQLite recovery database per user/project `ScopeReference` under `recovery/journal/v1/`. It is separate from the scope-lock database, whose protocol intentionally permits no lifecycle tables. Use `journal_mode=DELETE`, `synchronous=FULL`, `foreign_keys=ON`, `trusted_schema=OFF`, zero native busy timeout, application-level abort-aware jitter, strict protocol/table definitions, durable root/database identity markers, and local-filesystem capability probing. A committed SQLite transaction is the journal durability acknowledgment; no weaker in-memory or process-local fallback exists.
- **Owner liveness**: The journal adapter records a private process identity (`pid`, OS process-start token, adapter nonce) beside `prepared` rows; it never enters the public record or diagnostics. A live owner prevents another process from recovering or abandoning its transition. A proven-dead owner permits recovery. Unknown liveness retains evidence and reports. Returning `recovery-required` clears ownership so another startup may resume even while the originating process remains alive.
- **Corruption isolation**: Each journal row carries canonical record JSON and a SHA-256 digest. A malformed/digest-mismatched row moves to a quarantine table in the same short transaction and produces a stable safe diagnostic keyed by scope/reference when available. A database-level failure blocks only that scope. A state record pointing at a missing or quarantined journal entry remains pending and unavailable; recovery never fabricates the missing transition.
- **Candidate versus previous decision**: When state contains the exact pending reference and candidate state, recovery first inspects exact candidate activation evidence. A candidate match finalizes. Missing, failed, or mismatched observation chooses the conservative existing compensation path: restore previous state with the same pending marker, reload, verify the stored previous projection, then clear pending. When state already contains previous-with-pending, recovery resumes that compensation. Any other target shape is a conflict and remains `recovery-required`.
- **Indeterminate reload**: Reload invocation is never proof. Candidate observation must match scope, plugin, revision, and projection digest. An observation error or mismatch does not trigger a second candidate reload; it rolls back through the shared reconciler. `rolled-back` is emitted only after previous state and projection are both proven. If either side cannot be proven, the pending record remains and the affected plugin is blocked while unrelated plugins continue.
- **No hidden retries**: Recovery performs one local evidence pass and the reconciler's existing bounded one-time target-preserving generation rebase. Stale contention, adapter failure, unknown owner status, or an exhausted caller signal remains durable work for the next startup. There is no retry daemon, exponential backoff, lease expiry, network call, or blind replay.
- **Startup budget**: Export a production default of 2,000 ms and 128 transition records for required local reconciliation. The injected monotonic clock and caller signal enforce the deadline. Referenced transitions are processed before cleanup; if the budget expires, affected pending plugins stay blocked and a typed `deferred` result identifies safe references. Garbage collection uses a separate best-effort slice after required recovery and may be skipped without weakening activation safety.
- **State scope inventory**: A narrow `LifecycleStateInventoryPort` discovers persisted scope contexts; every listed context is re-read through authoritative `LifecycleStateStore`. Inventory is discovery only, never a second state authority. If any state/journal/lease inventory needed for a closed-world collection pass is incomplete or corrupt, destructive immutable-content collection stops for that pass.
- **Session liveness**: Runtime consumers acquire a `RevisionLease` before exposing immutable content/projection roots and release it only after hooks/MCP processes can no longer use them. Leases contain safe artifact references and private process identity. Live and unknown owners pin content; only explicit release or proven process death removes the pin. PID reuse is rejected with the process-start token. Unsupported liveness inspection returns `unknown` and retains content rather than using heartbeat expiry.
- **Grace policy**: The default inactive/unreferenced grace is 24 hours. First-unreferenced time is recorded only after a complete closed-world scan; filesystem mtime is not retirement authority. A candidate must remain unreferenced across complete scans for the full grace. Terminal journal rows remain for seven days after all artifacts and any confirmed cleanup are complete, then become pruneable audit residue.
- **Reference-driven collection**: Retention roots are the union of every revision and marketplace snapshot in every readable authoritative scope, both projections and all revisions in nonterminal transition records, and all live/unknown session leases. Inactive revisions remain state roots until a generation-coordinated exact-target mutation removes only expired nonselected revisions. Physical deletion happens only after a fresh authoritative rescan proves the artifact unreferenced.
- **Opaque deletion capabilities**: A separate recovery-only `RevisionArtifactStore` inventories ready plugin/marketplace revisions, generated projections, and incomplete staging/prepared roots and returns adapter-issued opaque candidates bound to root capability plus device/inode and verified metadata. Removal revalidates the same identity immediately before deletion. Raw paths, caller-constructed keys, and `ContentStorePort` never gain a delete method.
- **Abandoned staging**: Staging allocation writes an adapter-private owner sidecar outside the materializer-visible slot. Recovery removes staging/projection-prepared roots only when ownership is proven dead and the 24-hour grace has elapsed. Unknown/live ownership, missing sidecar evidence, parent replacement, or identity mismatch retains the directory and reports it.
- **Persistent data and secrets**: Revision GC schemas cannot represent `PluginDataRef` as a collectable artifact and never call configuration/secret deletion. A terminal uninstall with `retainedData: delete-confirmed` follows a separate confirmed-cleanup path after deactivation, no live/unknown lease, and grace: reconstruct configuration descriptors from retained immutable evidence, call existing `removePluginConfiguration`, then use an opaque confirmed-data-removal plan. Failure keeps data and the required revision evidence. `keep` can never reach this path.
- **Collection ordering**: Settle referenced transitions; complete confirmed cleanup if authorized; prune eligible inactive revision records under the existing generation coordinator; rescan all roots; delete unreferenced projections, plugin/marketplace revisions, then dead abandoned staging; mark terminal journal collection complete; prune old terminal journal/retention marks last. Every step is idempotent and a failure only delays later steps.
- **Diagnostics**: Add stable codes `TRANSITION_JOURNAL_CORRUPT`, `RECOVERY_CONFLICT`, and `COLLECTION_DEFERRED`. Safe results contain scope/plugin/reference, artifact kind/key where already public, and action/reason. They never expose paths, allocation ids, PIDs/start tokens, SQLite/native errors, secret/config values, or quarantined raw bytes.
- **Review posture**: This design is security- and data-integrity-sensitive and would normally receive an independent design advisory. The caller explicitly prohibited nested subagents and peeragent, so design-time advisory is skipped non-blockingly. Implementation still receives feature-level `review_weight: standard` from project policy; the caller's standard closure rule remains one independent pass, adjudication, fixes, and verification without re-review.
- **Foundation timing**: Code-first. `SPEC` and `ARCHITECTURE` already state the intended recovery/retention behavior. Implementation rolls them forward only if final contract names or the exact journal/lease/collection guarantees make an existing assertion false or misleading.

## Architectural choice

### Option A — make startup a second lifecycle command engine

Recovery could reconstruct an operation request and call install/update/enable/disable/uninstall again. This appears to maximize reuse, but it would repeat acquisition, trust, configuration, promotion, and command semantics against changed external inputs. A crash could therefore activate different bytes or overwrite newer state. Rejected.

### Option B — use an event-sourced workflow log and replay every mutation step

The journal could store step events and a generic saga runner could replay from the last event. That offers detailed history, but introduces a second mutation language, more fsync boundaries, migrations for workflow internals, and ambiguous replay of reload/adapter effects. It is substantially more machinery than the five lifecycle operations require. Rejected.

### Option C — durable decision evidence plus one shared transition reconciler and conservative mark/sweep (chosen)

The journal stores immutable before/candidate/final states and exact before/candidate projections. The existing operation service and startup recovery share the same narrow finalization/compensation reconciler. Recovery classifies current state/observation but never rebuilds a command. Collection separately computes a closed-world retained set, ages only proven-unreferenced artifacts, and deletes through opaque adapter capabilities.

**Choice**: Option C. It preserves one mutation contract, gives crashes enough durable evidence for an exact decision, and keeps storage traversal/deletion outside lifecycle command APIs.

## Trickiest unit first

The highest-risk unit is deciding what to do after state selected the candidate but the process died before terminal settlement. Reload may have succeeded, failed before effects, partially applied, or succeeded and lost its response. Recovery therefore uses only four exact facts: the referenced journal record, current target state with the same pending reference, stored candidate/previous projection expectations, and independent activation observation. Exact candidate observation permits finalization. Every other candidate observation outcome takes the already-defined compensation route; recovery never retries candidate activation. Compensation success still requires exact previous observation. Anything unprovable remains pending and blocks only that plugin.

The fallback is deliberate availability loss for the affected plugin, not a guessed mutation. Corrupt/missing previous immutable evidence, unreadable authoritative state, unknown owner liveness, or repeated generation contention yields `recovery-required`/`deferred`, retains all related artifacts, and allows unrelated state to load.

## Implementation units

### Unit 1: Journal/recovery contracts and shared transition reconciler

**Story**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts`

**Files**:
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/lifecycle-transition-reconciler.ts`
- `src/application/recovery-contract.ts`
- `src/application/ports/lifecycle-clock.ts`
- `src/application/ports/lifecycle-transition-store.ts`
- `test/application/lifecycle-transition-reconciler.test.ts`
- `test/application/recovery-contract.test.ts`
- `test/application/plugin-lifecycle-service.test.ts`

```typescript
export const EpochMillisecondsSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export type EpochMilliseconds = z.infer<typeof EpochMillisecondsSchema>;

export interface LifecycleClock {
  nowEpochMilliseconds(): EpochMilliseconds;
  monotonicMilliseconds(): number;
}

export const LifecycleTransitionRecordSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  reference: PendingTransitionRefSchema,
  operationId: LifecycleOperationIdSchema,
  operation: LifecycleOperationSchema,
  origin: LifecycleOriginSchema,
  scope: ScopeReferenceSchema,
  plugin: PluginKeySchema,
  startingGeneration: GenerationSchema,
  previous: LifecyclePluginStateSchema.nullable(),
  candidate: LifecyclePluginStateSchema,
  final: LifecyclePluginStateSchema.nullable(),
  previousProjection: ProjectionExpectationSchema,
  candidateProjection: ProjectionExpectationSchema,
  retainedData: LifecycleRetainedDataSchema,
}).strict().readonly();

export const LifecycleTransitionStatusSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("prepared") }).strict().readonly(),
  z.object({ kind: z.literal("recovery-required"), generation: GenerationSchema.optional() }).strict().readonly(),
  z.object({ kind: z.enum(["completed", "rolled-back", "abandoned"]), generation: GenerationSchema.optional() }).strict().readonly(),
  z.object({ kind: z.literal("quarantined"), code: z.literal("TRANSITION_JOURNAL_CORRUPT") }).strict().readonly(),
]);

export const LifecycleTransitionJournalEntrySchemaV1 = z.object({
  schemaVersion: z.literal(1),
  record: LifecycleTransitionRecordSchemaV1,
  status: LifecycleTransitionStatusSchema,
  preparedAt: EpochMillisecondsSchema,
  statusAt: EpochMillisecondsSchema,
  collectionCompletedAt: EpochMillisecondsSchema.optional(),
}).strict().readonly();

export interface LifecycleTransitionStore {
  prepare(request: Readonly<{
    record: LifecycleTransitionRecord;
    preparedAt: EpochMilliseconds;
  }>, signal: AbortSignal): Promise<"stored" | "already-present">;
  read(request: Readonly<{
    scope: ScopeReference;
    reference: PendingTransitionRef;
  }>, signal: AbortSignal): Promise<TransitionJournalReadResult>;
  list(scope: ScopeReference, signal: AbortSignal): Promise<TransitionJournalCollection>;
  markRecoveryRequired(request: Readonly<{
    scope: ScopeReference;
    reference: PendingTransitionRef;
    generation?: Generation;
    at: EpochMilliseconds;
  }>, signal: AbortSignal): Promise<"stored" | "already-present" | "terminal">;
  settle(request: Readonly<{
    scope: ScopeReference;
    reference: PendingTransitionRef;
    outcome: "completed" | "rolled-back" | "abandoned";
    generation?: Generation;
    at: EpochMilliseconds;
  }>, signal: AbortSignal): Promise<"stored" | "already-present" | "conflict">;
  markCollectionComplete(request: Readonly<{
    scope: ScopeReference;
    reference: PendingTransitionRef;
    at: EpochMilliseconds;
  }>, signal: AbortSignal): Promise<void>;
  pruneTerminal(request: Readonly<{ before: EpochMilliseconds }>, signal: AbortSignal): Promise<number>;
}
```

`LifecycleTransitionReconciler` owns the exact helpers currently private to `plugin-lifecycle-service.ts`: target comparison without pending, one target-preserving generation rebase, replacement mutation construction, reload/observe comparison, terminal pending clear, and verified previous-state compensation. It exposes only `completeCommittedTransition(...)` for ordinary operations and `recoverInterruptedTransition(...)` for startup; neither accepts arbitrary replacement state. The lifecycle facade maps reconciler outcomes back to its existing public result union and marks every unresolved post-commit return `recovery-required` in the journal before returning where possible.

**Acceptance criteria**:
- [ ] Transition records bind exact previous/candidate/final state and both exact projection expectations while excluding pending fields, paths, secrets, expanded configuration, process identity, and native errors.
- [ ] Reference derivation remains deterministic and rejects any record whose scope/plugin/operation identity does not match its opaque reference.
- [ ] Shared reconciler helpers are the only code that clears pending state, restores previous state, or compares lifecycle activation observations; recovery defines no structural mutation alternative.
- [ ] Candidate-finalization, previous-compensation, target-change, unrelated-generation rebase, finalization ambiguity, rollback ambiguity, and abort outcomes preserve existing lifecycle public semantics.
- [ ] Journal status transitions are schema-derived, terminal conflicts fail closed, and `recovery-required` remains resumable.

### Unit 2: Durable per-scope transition journal and row quarantine

**Story**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter`
**Depends on**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts`

**Files**:
- `src/infrastructure/recovery/local-recovery-filesystem.ts`
- `src/infrastructure/recovery/sqlite-transition-journal.ts`
- `test/infrastructure/recovery/sqlite-transition-journal.test.ts`
- `test/fixtures/recovery/child-journal-writer.mjs`

The database protocol is version 1 with strict tables `recovery_protocol`, `lifecycle_transitions`, and `transition_quarantine`. `lifecycle_transitions` stores reference, canonical record JSON bytes, SHA-256 digest, status, generation, prepared/status/collection timestamps, and private owner evidence. Primary key is the transition reference; the database filename is derived only from validated user/project scope. Prepare is an insert-no-replace operation. An existing row is idempotent only when record bytes, digest, scope, and prepared time match exactly.

Each mutating call opens a short rollback-journal transaction with zero busy timeout and abort-aware bounded jitter, validates root/database identity before and after opening, checks the allowed status edge, commits with `synchronous=FULL`, and closes. Invalid rows move to quarantine atomically when the containing database remains trustworthy. Quarantine preserves raw bytes internally for diagnosis but returns only stable safe diagnostics. Protocol/schema/database corruption returns a scope-level failed collection and leaves other scope databases readable.

**Acceptance criteria**:
- [ ] Killing a writer before commit yields no readable row; killing it after acknowledged commit yields one complete digest-valid row after restart.
- [ ] Two processes preparing the same exact record converge idempotently; differing bytes under one reference fail/quarantine without overwriting either evidence set.
- [ ] Only allowed status edges commit; repeated identical edges are idempotent and conflicting terminal outcomes return `conflict`.
- [ ] `journal_mode=DELETE`, `synchronous=FULL`, root/database identity checks, local-filesystem probe, and final transaction durability are asserted by tests; no process-local fallback exists.
- [ ] Proven-dead, live, released, and unknown owner classifications reject PID reuse and never expose process evidence publicly.
- [ ] One malformed row is quarantined while valid siblings remain; database-level corruption blocks only its scope and emits no path/native/raw-record details.

### Unit 3: Bounded startup recovery and abandoned-staging reconciliation

**Story**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-startup-recovery`
**Depends on**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts`, `epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter`

**Files**:
- `src/application/recovery-service.ts`
- `src/application/ports/lifecycle-state-inventory.ts`
- `src/application/ports/recovery-artifacts.ts`
- `src/infrastructure/filesystem/staging-allocator.ts`
- `src/infrastructure/recovery/recovery-artifact-scanner.ts`
- `test/application/recovery-service.test.ts`
- `test/infrastructure/recovery/recovery-artifact-scanner.test.ts`

```typescript
export const DefaultLifecycleRecoveryPolicy = Object.freeze({
  requiredBudgetMs: 2_000,
  maxTransitions: 128,
  abandonedGraceMs: 86_400_000,
});

export interface LifecycleRecoveryService {
  recover(request: Readonly<{
    requiredScopes: readonly ScopeContext[];
    policy?: Partial<LifecycleRecoveryPolicy>;
  }>, signal: AbortSignal): Promise<LifecycleRecoveryResult>;
}

export type TransitionRecoveryResult =
  | Readonly<{ kind: "finalized"; scope: ScopeReference; plugin: PluginKey; reference: PendingTransitionRef; generation: Generation }>
  | Readonly<{ kind: "rolled-back"; scope: ScopeReference; plugin: PluginKey; reference: PendingTransitionRef; generation: Generation }>
  | Readonly<{ kind: "abandoned"; scope: ScopeReference; plugin: PluginKey; reference: PendingTransitionRef }>
  | Readonly<{ kind: "deferred"; scope: ScopeReference; plugin?: PluginKey; reference?: PendingTransitionRef; code: "OWNER_LIVE" | "OWNER_UNKNOWN" | "BUDGET_EXHAUSTED" | "STATE_STALE" }>
  | Readonly<{ kind: "blocked"; scope: ScopeReference; plugin?: PluginKey; reference?: PendingTransitionRef; code: "JOURNAL_MISSING" | "JOURNAL_CORRUPT" | "STATE_CORRUPT" | "RECOVERY_CONFLICT" | "PREVIOUS_UNAVAILABLE" }>;
```

Recovery first reads each required authoritative scope, indexes every pending reference, then reads journal entries. Referenced dead/released/resumable records run before unreferenced records. Exact candidate-pending state observes candidate and either finalizes or compensates; exact previous-pending resumes compensation. Exact terminal state with no pending permits journal settlement only after its matching projection is observed. Unreferenced prepared records are abandoned only with dead ownership and elapsed grace. A live/unknown owner or budget exhaustion is deferred. Missing/quarantined references block only the owning plugin; a corrupt enclosing state scope blocks that scope.

The staging allocator records a private sidecar outside the materializer slot. The artifact scanner returns opaque, inode-bound abandoned candidates and owner status. Startup cleanup removes only dead-owned expired staging/projection-staging/prepared roots. It never touches ready immutable content in this unit. Required transition results are deterministic and sorted by scope/plugin/reference; diagnostics are bounded to the processed record count.

**Acceptance criteria**:
- [ ] Crash-point tests at prepare, first commit, candidate reload, candidate observation, compensation commit, previous reload, pending clear, and terminal settlement produce only finalized, verified rolled-back, or durable blocked/deferred results.
- [ ] Recovery performs no materialization, source/network, inspection, trust, configuration collection, promotion, runtime component execution, or lifecycle command call.
- [ ] Candidate mismatch/error chooses compensation and never retries candidate reload; `rolled-back` requires exact previous observation.
- [ ] Live/unknown owners are never taken over, dead owners are recoverable, unrelated scope/plugin records continue, and deadline/record limits leave durable evidence.
- [ ] Abandoned cleanup requires private sidecar, dead owner, elapsed grace, parent capability, and device/inode match; missing/unknown evidence retains the tree.

### Unit 4: Closed-world retention, session leases, revision pruning, and collection

**Story**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-retention-collection`
**Depends on**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts`, `epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter`

**Files**:
- `src/domain/content-store.ts`
- `src/application/revision-collection-service.ts`
- `src/application/confirmed-uninstall-cleanup.ts`
- `src/application/ports/revision-artifact-store.ts`
- `src/application/ports/revision-lease-store.ts`
- `src/application/ports/revision-retention-store.ts`
- `src/application/ports/persistent-data-removal.ts`
- `src/infrastructure/recovery/sqlite-revision-retention.ts`
- `src/infrastructure/recovery/revision-artifact-store.ts`
- `src/infrastructure/recovery/process-revision-leases.ts`
- `src/infrastructure/filesystem/content-store-layout.ts`
- `test/application/revision-collection-service.test.ts`
- `test/application/confirmed-uninstall-cleanup.test.ts`
- `test/infrastructure/recovery/revision-artifact-store.test.ts`
- `test/infrastructure/recovery/process-revision-leases.test.ts`

```typescript
export const DefaultRevisionCollectionPolicy = Object.freeze({
  unreferencedGraceMs: 86_400_000,
  terminalJournalRetentionMs: 604_800_000,
  maxArtifactsPerRun: 256,
});

export const RetainedArtifactRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("marketplace"), key: MarketplaceStoreKeySchema }).strict().readonly(),
  z.object({ kind: z.literal("plugin"), key: PluginStoreKeySchema }).strict().readonly(),
  z.object({ kind: z.literal("projection"), reference: ProjectionRootRefSchema }).strict().readonly(),
]);

export interface RevisionLeaseStore {
  acquire(request: Readonly<{
    sessionId: string;
    artifacts: readonly RetainedArtifactRef[];
    at: EpochMilliseconds;
  }>, signal: AbortSignal): Promise<RevisionLease>;
  replace(lease: RevisionLease, artifacts: readonly RetainedArtifactRef[], at: EpochMilliseconds, signal: AbortSignal): Promise<RevisionLease>;
  release(lease: RevisionLease, at: EpochMilliseconds, signal: AbortSignal): Promise<void>;
  list(signal: AbortSignal): Promise<RevisionLeaseCollection>;
}

export interface RevisionArtifactStore {
  scan(signal: AbortSignal): Promise<RevisionArtifactCollection>;
  remove(candidate: RevisionArtifactCandidate, signal: AbortSignal): Promise<"removed" | "already-absent">;
}

export interface RevisionRetentionStore {
  reconcile(request: Readonly<{
    completeScanAt: EpochMilliseconds;
    referenced: readonly RetainedArtifactRef[];
    observed: readonly RetainedArtifactRef[];
  }>, signal: AbortSignal): Promise<RevisionRetentionSnapshot>;
  markRemoved(reference: RetainedArtifactRef, at: EpochMilliseconds, signal: AbortSignal): Promise<void>;
}
```

A collection run must obtain a complete state-scope inventory, successful authoritative reads for every scope, complete nonterminal journal inventory, complete lease inventory, and complete physical artifact scan. It derives store keys from verified revision/snapshot evidence, never from paths. Live/unknown leases and all state/nonterminal-journal references form the retained set. Any incomplete prerequisite yields `COLLECTION_DEFERRED` and no ready-content deletion.

Eligible nonselected revisions are first removed from their plugin record through `GenerationMutationCoordinator` with an exact target/pending precondition. Stale or changed targets defer. After a fresh complete scan, the retention store begins or preserves `firstUnreferencedAt`; references clear their marks. Only a candidate still unreferenced after 24 hours is removed. Scanner-issued candidates are process-private capabilities bound to validated kind/key/ref, root capability, path, device/inode, and metadata; deletion revalidates all evidence.

Terminal `delete-confirmed` uninstall records use a separate opaque cleanup plan. After no live/unknown lease and grace, `InstalledPluginLoader` reconstructs descriptors while content is retained; existing `removePluginConfiguration` retires configuration and secrets; then `PersistentDataRemovalPort` validates the stable data reference and removes only that root. Partial failure retains content/journal evidence. The generic scanner has no data-root variant, and `keep` cannot construct the plan.

**Acceptance criteria**:
- [ ] Every state revision/marketplace, nonterminal transition previous/candidate/final/projection, and live/unknown lease pins its physical artifact across user/project scopes.
- [ ] Inactive selected-state arrays are pruned only after grace, exact target/pending checks, no lease, and a generation-coordinated commit; selected revisions are never pruned.
- [ ] A corrupt/missing scope, journal row, lease, scan entry, or retention ledger stops ready-content deletion for the pass and leaves unrelated recovery reporting available.
- [ ] Unreferenced age begins only after a complete scan, survives restart, clears when referenced again, and requires a second complete scan after grace before deletion.
- [ ] Deletion refuses forged/stale/path-swapped candidates and never exposes or deletes data/configuration/secrets as revision garbage.
- [ ] `delete-confirmed` cleanup occurs only after terminal uninstall, lease/grace safety, descriptor reconstruction, and configuration/secret retirement; `keep` and partial failure preserve data.
- [ ] Repeated collection after partial deletion is idempotent; terminal journal pruning occurs only after collection/confirmed cleanup completion plus seven days.

### Unit 5: Composition, integration crash matrix, public boundary, and rolling docs

**Story**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-integration-hardening`
**Depends on**: `epic-transactional-plugin-lifecycle-recovery-journal-gc-startup-recovery`, `epic-transactional-plugin-lifecycle-recovery-journal-gc-retention-collection`

**Files**:
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/lifecycle-recovery.test.ts`
- `test/integration/revision-collection.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and `docs/COMPATIBILITY.md` only where landed assertions require correction

`createNodeRecoveryAdapters({hostRoot})` composes the private recovery filesystem, per-scope transition journals, retention ledger, process leases, artifact scanner, and confirmed data-removal adapter. The public application surface exposes schemas, typed recovery/collection results, policy values, service factories, and narrow ports needed by composition/runtime consumers. It does not export SQLite handles/schema SQL, path codecs, owner evidence, scanner capability constructors, quarantine bytes, raw deletion functions, reconciler mutation helpers, or fake adapters.

Integration uses real temporary roots and child Node processes. It performs lifecycle updates/uninstalls, kills children at journal/state/reload/finalization boundaries, restarts adapters, recovers required user/project scopes, holds old revision leases in a second process, advances an injected clock, and proves state pruning precedes physical deletion. A whole-plugin fixture retains skill/hook/MCP projection evidence without running those components.

**Acceptance criteria**:
- [ ] Real restart tests prove candidate finalization, conservative verified rollback, missing/corrupt journal isolation, live-owner non-takeover, dead-owner recovery, and unrelated plugin/scope availability.
- [ ] Two-process tests prove an old revision remains while a session lease is live/unknown and becomes eligible only after proven death/release plus complete-scan grace.
- [ ] Collection tests prove state pruning before physical deletion, shared physical content retained by another scope, projections/staging handled separately, and persistent data never enters generic GC.
- [ ] Public source/compiled exports expose no second lifecycle command path, arbitrary state replacement, raw filesystem deletion, owner/PID evidence, SQLite internals, path/token leakage, or secret-bearing result.
- [ ] Dependency rules keep recovery policy in application/domain, filesystem/SQLite/process effects in infrastructure, and ordinary lifecycle/source/runtime modules unable to import recovery deletion internals.
- [ ] Full `npm test` passes strict production/test typechecking, boundaries, unit/integration/child-process crash tests, build, and exact compiled import.
- [ ] Foundation documents remain rolling-current and do not imply network startup work, runtime-component execution, heartbeat lease expiry, or revision-GC deletion of persistent data.

## Implementation order

1. `epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts`
2. `epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter`
3. In parallel after contracts + journal:
   - `epic-transactional-plugin-lifecycle-recovery-journal-gc-startup-recovery`
   - `epic-transactional-plugin-lifecycle-recovery-journal-gc-retention-collection`
4. `epic-transactional-plugin-lifecycle-recovery-journal-gc-integration-hardening`

The feature remains one normal implementation/review bundle. Stories are durable correctness checkpoints, not one-agent assignments. The startup and collection units have disjoint primary application surfaces after the shared contracts/journal, but one owner should normally carry both so journal status, retained roots, and cleanup ordering stay coherent.

## Simplification

- Extract the current lifecycle finalization/rollback helpers instead of adding recovery-specific mutation code, a saga framework, event replay, or operation-command retries.
- Keep authoritative state unchanged except removal of expired nonselected revisions; do not add journal status, timestamps, physical paths, projections, leases, or GC marks to state schemas.
- Keep the scope-lock SQLite protocol database unchanged. Recovery gets a separate durable adapter rather than weakening that database's one-table invariant.
- Do not add heartbeat/expiry takeover, PID-only liveness, background retry queues, network refresh, per-component recovery, filesystem `current` pointers, or content repair-in-place.
- Do not add deletion to `ContentStorePort`. The recovery-only scanner issues narrow opaque capabilities after a complete inventory.
- Reuse `GenerationMutationCoordinator`, state constructors, projection verification, installed loader, configuration removal, content-store identities, root capabilities, and stable diagnostics. Detailed source verification, locking, and projection publication tests remain in their owning suites.

## Testing

- **Pure contract/classifier table**: exact previous/candidate/final state crossed with absent/matching/foreign pending reference and candidate/previous/mismatched observation. Protects the recovery decision boundary.
- **Shared reconciler regression matrix**: ordinary operation and startup routes both prove candidate finalization, previous compensation, one unrelated-generation rebase, target change, ambiguous finalization, and ambiguous rollback. Protects against two mutation engines.
- **Journal crash/durability tests**: child death before/after SQLite commit, busy cancellation, path/database marker replacement, protocol mismatch, duplicate prepare, terminal conflict, row quarantine, and scope database corruption. Protects write-ahead evidence.
- **Recovery integration**: kill at each transaction boundary, restart with user/project same plugin, keep unrelated plugins usable, and assert no source/trust/configuration/runtime execution call. Protects crash semantics and scope isolation.
- **Retention tests**: complete/incomplete inventories, shared roots, pending journals, selected/nonselected revisions, live/dead/unknown leases, first-unreferenced reset, grace boundaries, stale state mutation, inode/path swaps, partial delete, and restart idempotency. Protects data retention.
- **Confirmed cleanup tests**: `keep`, `delete-confirmed`, active/unknown lease, missing project-root authority, descriptor reconstruction failure, configuration CAS/secret partial failure, data deletion failure, and retry. Protects explicit deletion without conflating it with GC.
- **No duplicate low-value tests**: do not repeat materializer traversal, immutable publication, SQLite scope-lock exclusion, state schema, or configuration-secret matrices except where one end-to-end seam is needed.

## Risks

- **Riskiest assumption — exact runtime observation survives process replacement**: the future Pi adapter must expose activation evidence independently of the caller that initiated reload. Mitigation: recovery requires exact stored projection evidence and treats absent/invalid observation as rollback, never candidate success. Fallback: keep the plugin pending/blocked if previous restoration also cannot be proven.
- **Journal and authoritative state cannot commit atomically**: a crash can leave an orphan journal or state pointing at a prepared row. Mitigation: journal-first ordering makes the orphan inert; state references only a fully committed row; recovery classifies both shapes. Fallback: dead-owner grace abandons unreferenced prepares, while referenced missing/corrupt evidence blocks rather than guesses.
- **Process-liveness support varies by platform**: PID alone is unsafe and process-start identity may be unavailable. Mitigation: explicit release or start-token proof; unknown retains. Fallback: storage leaks on unsupported liveness inspection, not use-after-delete.
- **Closed-world inventory can be expensive**: full state/journal/lease/artifact scans add local I/O. Mitigation: mandatory transition recovery is bounded and ordered first; collection is capped, resumable, and skips deletion on incomplete evidence. Fallback: keep content and retry on a later startup/maintenance invocation.
- **State pruning races a lifecycle operation**: a collector could remove a revision while another process begins enable/update. Mitigation: same plugin scheduler/scope lock, exact target and pending preconditions, and a fresh post-prune scan before physical deletion. Fallback: stale result defers without deletion.
- **Shared content-addressed roots cross scopes**: deleting after checking one scope could break another. Mitigation: complete global scope inventory and physical-key retained-set union. Any missing scope stops ready-content deletion. Fallback: retain globally until inventory is complete.
- **Confirmed data deletion needs old immutable descriptors**: deleting content first could strand configuration/secret cleanup. Mitigation: terminal delete-confirmed records pin revision evidence until configuration/secret and data cleanup complete. Fallback: retain content/data/journal and report partial cleanup.
- **Least certainty — platform-safe recursive deletion after restart**: scanner capabilities must resist parent/path/inode replacement without relying on stale strings. Mitigation: reuse persistent root capabilities, no-follow traversal, metadata revalidation, and process-local candidate capabilities. Fallback: refuse deletion and report `COLLECTION_DEFERRED`.

## Pre-mortem

The design fails if recovery reruns a command against new bytes, finalizes merely because reload returned, restores state without verifying the previous runtime, takes over a live operation, deletes an inactive revision still used by another process/scope, ages from attacker-adjustable mtime, or lets `delete-confirmed` turn generic GC into data/secret deletion. The chosen design counters those failures with immutable journal evidence, one shared reconciler, exact observations, process-start liveness, closed-world roots, complete-scan aging, opaque deletion capabilities, and a separate confirmed-cleanup plan.

When evidence is uncertain, the invariant is simple: retain content, leave the affected transition/plugin visibly unresolved, and continue unrelated startup work. Availability or disk reclamation never outranks a provable working revision.

## Implementation summary

Implemented the complete recovery and collection bundle across the five ordered checkpoints:

- Reconciliation contracts and a shared transition reconciler now own exact observation, pending clearing, target-preserving generation rebase, verified compensation, and safe recovery classification.
- A separate per-scope SQLite journal provides durable write-ahead evidence, strict protocol markers, private owner liveness, resumable status, terminal conflict protection, and row quarantine.
- Startup recovery is bounded and deterministic, never replays lifecycle commands, isolates corrupt scopes, and cleans only dead-owned, grace-aged, identity-stable staging through opaque capabilities.
- Retention uses complete closed-world inventories, process-start-token leases, persistent first-unreferenced marks, generation-coordinated state pruning before physical deletion, and a scanner that has no persistent-data variant. Confirmed uninstall cleanup remains an explicit separate path.
- The Node composition root and explicit compiled export allowlist expose typed policy/services without SQLite, paths, owner evidence, raw deletion, or arbitrary replacement surfaces.

Implementation decisions and deviations:

- The repository's existing Node 24 SQLite and capability-root patterns were reused; no dependency was added and the scope-lock database protocol was not changed.
- Existing lifecycle test fakes use the legacy minimal transition-store methods, so the durable store's additional recovery methods remain optional at the application compatibility boundary while the Node adapter implements the complete surface.
- Foundation documents required no correction: their recovery, lease, startup-locality, and persistent-data statements already describe the landed contracts.
- The delegated endpoint prohibited nested advisory agents and peeragent; implementation used direct repository grounding only. Feature review remains the host autopilot responsibility.

Integrated verification:

- `npm test` — passed: TypeScript typecheck, dependency boundaries, 104 test files / 582 tests, build, and compiled package import with 389 exports.
- All five child stories reached `done` directly after their checkpoint verification; no child entered `review`.

## Review findings (2026-07-16)

Effective review weight: `standard` (project), one cross-model balanced pass by Umans GLM 5.2.

Receiver-confirmed material blockers:

- **Crash/durability evidence gap**: the shipped tests do not execute the feature's load-bearing real child-process crash/restart, concurrent prepare, two-process lease, and state-prune-before-delete acceptance scenarios. The old unused fixture was removed by the subsequent cadence refactor, so hardening must add purposeful current fixtures/tests rather than restore dead scaffolding unchanged.
- **Stale retained-set deletion window**: collection rereads physical artifacts after state pruning but does not refresh live/unknown leases and authoritative state references before deletion. A second ordinary Pi session can acquire a lease in that window and have referenced content removed.

Tracked by `epic-transactional-plugin-lifecycle-recovery-journal-gc-review-hardening`. Under `standard`, this feature needs only implementation and verification of that named fix set; it must not commission a second independent review pass. Lower-risk scoped settlement I/O was parked separately.

## Fix verification (2026-07-17)

The named standard-review fix set is complete in child commits `e35a24b` and `d228c99`:

- Added directly invoked child-process acceptance fixtures using the real Node transition-journal and process-lease adapters over temporary roots. They prove no row after a pre-acknowledgment kill, one digest-valid row after an acknowledged prepare and restart, identical concurrent prepare convergence, and conflicting evidence isolation.
- Added a real second-process lease acceptance path proving a live lease prevents collection and explicit release permits it.
- Added real content, retention, journal, lease, and artifact-adapter acceptance proving the installed-state revision record is pruned before physical removal.
- Changed collection to refresh the complete state-scope/journal/lease retained set after pruning and before physical deletion. Incomplete refreshed evidence defers deletion; all refreshed state revisions and live/unknown lease references are unioned with the initial set. Existing fresh artifact identity rescan/revalidation remains in place.
- Added deterministic regressions for lease acquisition in the deletion window, incomplete lease refresh, and state-record pruning before physical removal.
- Added bounded abort-aware SQLite busy retries so real concurrent journal prepares converge without changing the zero native busy timeout or persisted schema.

Integrated verification after the fix: `npm test` passed — strict production/test typechecking, dependency boundaries, 114 test files / 623 tests, build, and compiled package import with 407 exports. Public exports and dependency boundaries are unchanged.

The child checkpoint is `stage: done`; this parent feature is returned to `stage: review` for host administrative closure. The one permitted standard review pass is satisfied; no second independent review was run.

## Review (2026-07-17)

**Verdict**: Approve

**Blockers**: none
**Important**: scoped journal settlement I/O was valid but below the current-cycle blocker bar; parked as `idea-recovery-scoped-journal-settlement`.
**Nits**: low-value diagnostic/style and first-creation race observations remain non-blocking under the project risk bar.
**Rejected**: no material proposals rejected; platform-unsupported liveness intentionally retains content rather than weakening ownership proof.

**Notes**: Effective weight `standard` from project policy. One cross-model balanced pass by Umans GLM 5.2 found two receiver-confirmed blockers. The named fix set added real crash/restart, concurrent prepare, second-process lease, and state-prune-before-delete acceptance plus refreshed state/lease pins before physical removal. Host administrative fix verification ran without a second independent pass, as required by standard. Final integrated `npm test`: typecheck, boundaries, 114 files / 623 tests, build, and unchanged 407 compiled exports.
