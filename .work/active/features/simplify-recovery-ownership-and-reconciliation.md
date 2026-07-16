---
id: simplify-recovery-ownership-and-reconciliation
kind: feature
stage: done
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Simplify Recovery Ownership and Reconciliation Internals

## Brief

The recovery implementation landed with one superseded reconciliation path, repeated Linux process-owner detection, and scattered unused scaffolding. Design a behavior-preserving cleanup that removes the dead path and gives process identity a neutral infrastructure home without weakening owner, capability, journal, or deletion guarantees.

## Discovery evidence

### High — eliminate superseded lifecycle reconciliation

**Source lens:** dead weight / elimination

- `src/application/plugin-lifecycle-service.ts:463-573` retains `commitPendingReplacement`, `finalize`, and `rollback`, but the live lifecycle path delegates completion and rollback to `createLifecycleTransitionReconciler` at `src/application/plugin-lifecycle-service.ts:792-812`; there is no caller of the local `rollback` function.
- The dead path keeps its own rebase constant and failure class at `src/application/plugin-lifecycle-service.ts:198-208`, plus otherwise-unused helpers such as `targetWithoutPending` at line 224 and `isActiveExpectation` at line 321.
- `src/application/lifecycle-transition-reconciler.ts:46` still requires an `InstalledPluginLoader` dependency that the reconciler never reads, leaving the composition call in `plugin-lifecycle-service.ts:440-447` misleadingly broader than the implementation.

**Rationale:** removing the duplicate transition engine deletes a substantial unreachable control path and makes the reconciler the obvious single owner of post-commit settlement and rollback.

### Medium — centralize process-owner evidence

**Source lens:** missing abstraction / pattern drift

- `/proc/<pid>/stat` start-token parsing is independently implemented in `src/infrastructure/filesystem/staging-allocator.ts:48-59`, `src/infrastructure/recovery/sqlite-transition-journal.ts:53-63`, and `src/infrastructure/recovery/process-revision-leases.ts:10-11`.
- `src/infrastructure/recovery/recovery-artifact-scanner.ts:6,35,67` imports owner classification from the SQLite journal adapter even though process liveness is not a journal concern.

**Rationale:** one small neutral process-identity utility under `src/infrastructure/process/` removes fragile duplicate parsing and decouples artifact scanning from the SQLite journal while preserving each caller's current fail-closed handling.

### Medium — remove recovery scaffolding that has no runtime or test role

**Source lens:** dead weight

- `src/infrastructure/recovery/sqlite-transition-journal.ts:48,91` contains unused `sameJson` and `tableSql` helpers; its `settle` path also computes an identical value on both sides of an owner-reset conditional around line 290.
- `src/application/recovery-service.ts:37` and `src/application/revision-collection-service.ts:49` contain unused lookup/equality helpers, while `revisionRef` at line 51 accepts an unused scope.
- `src/infrastructure/filesystem/staging-allocator.ts:95,176,222-224` maintains a `byRoot` map that is written and deliberately voided but never read.
- `test/fixtures/recovery/child-journal-writer.mjs` has no source or test caller.
- The scoped files also contain imports left unused by the dead reconciliation path; remove only imports proven unused after the structural cleanup.

**Rationale:** these remnants advertise capabilities and verification paths that do not exist, increasing review cost in security-sensitive recovery code.

## Constraints

- Preserve all public package exports and observable lifecycle, owner-status, journal, retention, cleanup, and deletion behavior.
- Preserve the distinction between missing process identity, unknown owner, released owner, and proven-dead owner; do not turn an uncertain owner into deletion authority.
- Keep process identity infrastructure-only. Domain and application layers remain independent of Node and `/proc`.
- Do not use the cleanup to strengthen validation, change scan-completeness semantics, or add recovery capability; route those as behavior-changing work.
- Verification covers typecheck, dependency boundaries, existing recovery tests, and package export checks. The process-identity extraction receives one focused unit test because it becomes the shared security-sensitive classification interface.

## Design decisions

- **Black-box classification:** pure refactor. The live lifecycle path already uses `createLifecycleTransitionReconciler`; deleted functions have no callers, and the shared process utility returns the same evidence states as the adapter-local implementations.
- **Discovery method:** direct-read only. The target is a bounded set of application and infrastructure files, and the endpoint constraint forbids nested delegation.
- **Neutral utility scope:** include the fourth identical `/proc/<pid>/stat` parser found in `src/infrastructure/state/sqlite-scope-lock.ts`, not only the three named during discovery. One infrastructure-only module then owns all production start-token parsing and live/dead/unknown classification.
- **Owner-state boundary:** the neutral utility knows only `live | dead | unknown`. SQLite journal absence or a non-prepared/owner-cleared row continues to map to `released` inside the journal adapter. Missing current-process identity remains `undefined` from the reader and each allocating caller keeps its existing error. Scanner parse failures remain non-deletable, and only `dead` authorizes removal.
- **Public compatibility:** do not export the new utility from `src/index.ts`; do not alter the 407-entry compiled package allowlist. Adapter-local `classifyOwner` is not part of the package export surface and is removed after its callers move to the neutral module.
- **Story shape:** three checkpoints match the three verified findings. Steps 1 and 2 are independent. Step 3 waits for both because it removes fallout and touches the same journal/staging files; this keeps each rollback meaningful without turning every deleted helper into a worker-sized story.

## Existing behavioral evidence

- `test/application/plugin-lifecycle-service.test.ts` proves unchanged install/disable/enable/update/uninstall outcomes, verified rollback, unrelated-generation rebasing, and recovery-required behavior.
- `test/application/lifecycle-transition-reconciler.test.ts` protects exact projection evidence.
- `test/infrastructure/recovery/sqlite-transition-journal.test.ts` protects durable status edges and the `live` versus `released` owner distinction.
- `test/infrastructure/recovery/process-revision-leases.test.ts` protects live lease ownership and explicit release.
- `test/infrastructure/recovery/recovery-artifact-scanner.test.ts` proves a live/uncertain owner cannot authorize deletion.
- `test/infrastructure/state/sqlite-scope-lock.test.ts` and `test/integration/generation-locking.test.ts` prove live owners are not stolen and dead processes release/recover ownership.
- `test/application/recovery-service.test.ts`, `test/application/revision-collection-service.test.ts`, and the recovery/collection integration tests protect fail-closed scan and deletion behavior.
- `npm test` currently passes typecheck, dependency boundaries, 112 files / 611 tests, build, and the 407-export compiled-package check.

## Refactor Overview

Delete the superseded lifecycle-service settlement engine so the reconciler is the sole post-commit owner; extract one infrastructure process-identity module and route every production `/proc` owner probe through it; then remove only mechanically proven unused recovery scaffolding. No state schema, application port, package export, lifecycle result, journal status, scan completeness rule, grace period, capability check, or deletion predicate changes.

## Refactor Steps

### Step 1: Make the transition reconciler the sole settlement owner

**Priority**: High
**Risk**: Medium
**Source Lens**: elimination / dead weight
**Files**: `src/application/plugin-lifecycle-service.ts`, `src/application/lifecycle-transition-reconciler.ts`
**Story**: `simplify-recovery-ownership-and-reconciliation-step-1`

**Current State**:
```ts
// plugin-lifecycle-service.ts has an unreachable second settlement engine.
const MAX_PENDING_REBASE_ATTEMPTS = 2;
class FinalizationFailure extends Error { /* ... */ }
function matchesIntermediateRecord(/* ... */): boolean { /* ... */ }
async function commitPendingReplacement(/* ... */) { /* ... */ }
async function finalize(/* ... */) { /* ... */ }
async function rollback(/* ... */) { /* ... */ }

// The live path does not call those functions.
const reconciled = await reconciler.completeCommittedTransition(/* ... */);

// lifecycle-transition-reconciler.ts declares but never reads this dependency.
type LifecycleTransitionReconcilerDependencies = Readonly<{
  mutations: GenerationMutationCoordinator;
  state: { read(/* ... */): Promise<StateLoadResult> };
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  installed: InstalledPluginLoader;
  sha256: Sha256;
}>;
```

**Target State**:
```ts
// plugin-lifecycle-service.ts retains first commit, reload/observation, and delegation only.
const reconciler = createLifecycleTransitionReconciler({
  state: dependencies.state,
  mutations: dependencies.mutations,
  reload: dependencies.reload,
  transitions: dependencies.transitions,
  sha256: dependencies.sha256,
});
// ...
const reconciled = await reconciler.completeCommittedTransition({
  operation,
  scope,
  plugin,
  previous,
  candidate,
  final: finalRecord,
  reference,
  committed,
  previousProjection: previousExpectation,
  candidateProjection: candidateExpectation,
  activation,
}, signal);

type LifecycleTransitionReconcilerDependencies = Readonly<{
  mutations: GenerationMutationCoordinator;
  state: { read(scope: ScopeContext, signal: AbortSignal): Promise<StateLoadResult> };
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  sha256: Sha256;
}>;
```

**Implementation Notes**:
- Remove `FinalizationFailure`, `MAX_PENDING_REBASE_ATTEMPTS`, `targetWithoutPending`, `matchesIntermediateRecord`, `isActiveExpectation`, `commitPendingReplacement`, `finalize`, and `rollback` from `plugin-lifecycle-service.ts` only after a final symbol search confirms no caller.
- Retain `withPending`, `withoutPending`, `replaceTarget`, `reloadAndObserve`, and the installed loader on `PluginLifecycleServiceDependencies`; the first commit and previous-projection preparation still use them.
- Remove the reconciler's `InstalledPluginLoader` import/property and the corresponding composition argument. Do not alter reconciler algorithms, rebase attempts, result mapping, transition settlement, or recovery marking.
- Remove only import fallout proven unused by this deletion (`ProjectionExpectationSchema`, `GenerationSchema`, and `CandidatePreparationResult` are current candidates); let typecheck verify the exact final set.

**Acceptance Criteria**:
- [ ] Symbol search finds no local duplicate finalization/rollback engine in `plugin-lifecycle-service.ts`; `createLifecycleTransitionReconciler` is the sole post-commit completion/rollback owner.
- [ ] Reconciler construction and dependency types contain no `installed` dependency, while `PluginLifecycleServiceDependencies.installed` remains for candidate/previous projection loading.
- [ ] `test/application/plugin-lifecycle-service.test.ts`, `test/application/lifecycle-transition-reconciler.test.ts`, and `test/integration/plugin-lifecycle.test.ts` pass unchanged.
- [ ] Typecheck, dependency boundaries, build, and package export check pass; the public package export count remains 407.

**Rollback**: revert this step's commit to restore the unreachable helpers and unused dependency; it has no data or migration effects.

---

### Step 2: Centralize Linux process identity without collapsing owner states

**Priority**: Medium
**Risk**: Medium
**Source Lens**: missing abstraction / pattern drift
**Files**: `src/infrastructure/process/process-identity.ts`, `src/infrastructure/filesystem/staging-allocator.ts`, `src/infrastructure/recovery/sqlite-transition-journal.ts`, `src/infrastructure/recovery/process-revision-leases.ts`, `src/infrastructure/recovery/recovery-artifact-scanner.ts`, `src/infrastructure/state/sqlite-scope-lock.ts`, `test/infrastructure/process/process-identity.test.ts`
**Story**: `simplify-recovery-ownership-and-reconciliation-step-2`

**Current State**:
```ts
// Four adapters independently parse Linux field 22 (index 19 after comm/state).
const text = readFileSync(`/proc/${pid}/stat`, "utf8");
const close = text.lastIndexOf(")");
const token = text.slice(close + 2).trim().split(/\s+/)[19];

// Journal and lease adapters independently classify liveness.
try { process.kill(pid, 0); }
catch (error) { return error.code === "ESRCH" ? "dead" : "unknown"; }
return currentToken === undefined ? "unknown" : currentToken === recordedToken ? "live" : "dead";

// Scanner imports process policy from a storage adapter.
import { classifyOwner } from "./sqlite-transition-journal.js";
```

**Target State**:
```ts
// src/infrastructure/process/process-identity.ts
export type ProcessIdentity = Readonly<{ pid: number; startToken: string }>;
export type ProcessIdentityStatus = "live" | "dead" | "unknown";

export function readLinuxProcessStartToken(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close === -1) return undefined;
    const token = stat.slice(close + 2).trim().split(/\s+/)[19];
    return token !== undefined && /^\d+$/.test(token) ? token : undefined;
  } catch {
    return undefined;
  }
}

export function classifyProcessIdentity(identity: ProcessIdentity): ProcessIdentityStatus {
  try { process.kill(identity.pid, 0); }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ESRCH" ? "dead" : "unknown"; }
  const current = readLinuxProcessStartToken(identity.pid);
  if (current === undefined) return "unknown";
  return current === identity.startToken ? "live" : "dead";
}
```

**Implementation Notes**:
- Route current-owner token acquisition in staging allocation, transition journal preparation, revision lease acquisition, and scope-lock initialization through `readLinuxProcessStartToken` while preserving each existing error text and failure path when it returns `undefined`.
- Route journal prepared-row checks, revision lease listing, recovery artifact scan/revalidation, and scope-lock initializer ownership through `classifyProcessIdentity`.
- Keep journal-only release logic in `ownerStatus`: missing rows, non-`prepared` rows, or cleared owner columns remain `released`/`unknown` exactly as today before classification is called.
- Keep scanner malformed sidecars invisible to deletion, map only shared `live | dead | unknown`, and retain the second `dead` check immediately before removal. Do not alter sidecar validation or capability/identity checks.
- Keep scope-lock marker field name `startTime` and all marker protocols unchanged; adapt only at the utility call as `{ pid: owner.pid, startToken: owner.startTime }`.
- Do not export the utility from `src/index.ts`. Add a focused internal unit test covering live identity, token mismatch/PID reuse as `dead`, ESRCH as `dead`, non-ESRCH signal failure as `unknown`, and readable-process/missing-token as `unknown`. Existing adapter/integration tests remain unchanged.

**Acceptance Criteria**:
- [ ] Production search finds one `/proc/${pid}/stat` reader, in `src/infrastructure/process/process-identity.ts`; fixture-only lock probes are out of scope.
- [ ] Production search finds process-owner `process.kill(pid, 0)` classification only in the neutral utility (command termination remains unrelated).
- [ ] The utility's status type excludes `released`; journal `ownerStatus` still returns all four existing statuses and never treats `unknown` as dead.
- [ ] `test/infrastructure/process/process-identity.test.ts`, journal, lease, scanner, scope-lock, generation-locking, lifecycle-recovery, and revision-collection tests pass.
- [ ] Dependency boundaries prove the new module remains infrastructure-only; no domain/application module imports it.
- [ ] Typecheck, build, and the unchanged 407-export package check pass.

**Rollback**: atomic multi-caller step. Revert the utility, all caller imports, and its focused test together; no persisted marker, journal, sidecar, or lease shape changes.

---

### Step 3: Remove only proven-unused recovery scaffolding

**Priority**: Medium
**Risk**: Low
**Source Lens**: elimination / dead weight
**Files**: `src/infrastructure/recovery/sqlite-transition-journal.ts`, `src/application/recovery-service.ts`, `src/application/revision-collection-service.ts`, `src/infrastructure/filesystem/staging-allocator.ts`, `test/fixtures/recovery/child-journal-writer.mjs`
**Story**: `simplify-recovery-ownership-and-reconciliation-step-3`

**Current State**:
```ts
function sameJson(/* ... */): boolean { /* unused */ }
function tableSql(name: string): string | undefined { return undefined; }
function target(/* ... */) { /* unused */ }
function revisionRef(scope: ScopeReference, revision: InstalledRevisionRecord, sha256: Sha256) { /* scope unused */ }

const byRoot = new Map<string, AllocationRecord>();
byRoot.set(canonical, record);
void byRoot;

const owner = outcome === "recovery-required" || terminal
  ? { pid: null, start: null, nonce: null }
  : { pid: null, start: null, nonce: null };
```

**Target State**:
```ts
function revisionRef(revision: InstalledRevisionRecord, sha256: Sha256): RetainedArtifactRef {
  return {
    kind: "plugin",
    key: createPluginStoreIdentityFromEvidence({
      sourceHash: revision.evidence.source.sourceHash,
      binding: revision.revision,
    }, sha256).key,
  };
}

// settle clears ownership directly for every accepted settlement outcome.
database.prepare(
  "UPDATE lifecycle_transitions SET status = ?, generation = ?, status_at = ?, owner_pid = NULL, owner_start_token = NULL, owner_nonce = NULL WHERE reference = ?",
).run(outcome, request.generation ?? null, request.at, String(request.reference));

// Staging ownership remains the WeakMap capability only; no byRoot map exists.
const owned = new WeakMap<object, AllocationRecord>();
```

**Implementation Notes**:
- Remove only the unused journal `sameJson`/`tableSql`, recovery-service `target`, revision-collection `sameJson`, staging `byRoot` declaration/write/comment/void, and imports made unused by those deletions.
- Drop the unused `scope` parameter from `revisionRef` and update its three callers without changing key evidence (`sourceHash` plus revision binding).
- Replace the identical owner-reset conditional with direct SQL `NULL` assignments; retain all status-edge validation and accepted outcomes.
- Delete `test/fixtures/recovery/child-journal-writer.mjs` only after a final source/test/package-script search confirms no executable reference. Tracking-item prose is historical evidence, not a caller.
- Do not remove validation, schema checks, journal columns, owner states, scan diagnostics, capability checks, grace periods, or compatibility paths.

**Acceptance Criteria**:
- [ ] Searches confirm each named helper/map/fixture has no executable caller before removal and no stale source/test import afterward.
- [ ] `revisionRef` still derives byte-for-byte equivalent plugin store references for all three call sites.
- [ ] Journal settlement still clears all three owner columns for completed, rolled-back, abandoned, and recovery-required accepted transitions.
- [ ] Staging allocation/discard capability behavior remains protected by the `owned` WeakMap and existing allocator tests.
- [ ] Recovery service, revision collection, SQLite journal, staging allocator, lifecycle recovery, and collection integration tests pass unchanged.
- [ ] Full `npm test` passes and compiled package exports remain exactly 407.

**Rollback**: revert this deletion-only commit. The removed fixture and scaffolding contain no runtime state; rollback is independent once Steps 1 and 2 remain in place.

## Implementation Order

1. `simplify-recovery-ownership-and-reconciliation-step-1` — remove the unreachable settlement owner.
2. `simplify-recovery-ownership-and-reconciliation-step-2` — land the process utility and all production callers atomically; it may be implemented in parallel with Step 1 but should be committed separately.
3. `simplify-recovery-ownership-and-reconciliation-step-3` — remove verified fallout after Steps 1 and 2, then run the full combined verification.

## Atomicity and rollback

- No step changes persistent data or requires a migration.
- Steps 1 and 3 are independently revertible deletion commits.
- Step 2 is inherently atomic across the new module and its callers: a partial extraction does not build. Its rollback boundary is the whole step, but persisted owner evidence and classification semantics remain unchanged.
- Step 3 depends on Steps 1 and 2 only to avoid overlapping cleanup and stale import accounting; it does not make their behavioral changes irreversible.

## Implementation Summary

Implemented all three checkpoints as one cohesive behavior-preserving refactor.

### Files changed by step

- **Step 1** — `src/application/plugin-lifecycle-service.ts`, `src/application/lifecycle-transition-reconciler.ts`, and the step-1 story item. Removed the unreachable local settlement engine and the reconciler's unused installed-loader dependency.
- **Step 2** — `src/infrastructure/process/process-identity.ts`, `test/infrastructure/process/process-identity.test.ts`, `src/infrastructure/filesystem/staging-allocator.ts`, `src/infrastructure/recovery/sqlite-transition-journal.ts`, `src/infrastructure/recovery/process-revision-leases.ts`, `src/infrastructure/recovery/recovery-artifact-scanner.ts`, `src/infrastructure/state/sqlite-scope-lock.ts`, and the step-2 story item. Centralized Linux process identity evidence while preserving journal-owned `released`, fail-closed `unknown`, PID-reuse `dead`, and live-owner behavior.
- **Step 3** — `src/infrastructure/recovery/sqlite-transition-journal.ts`, `src/application/recovery-service.ts`, `src/application/revision-collection-service.ts`, `src/infrastructure/filesystem/staging-allocator.ts`, `test/fixtures/recovery/child-journal-writer.mjs` (deleted), and the step-3 story item. Removed only proven-unused scaffolding and made settlement owner clearing explicit.

No state/schema/public export or lifecycle behavior changed. The existing capability checks, journal status matrix, recovery grace periods, scan completeness, second liveness check, deletion predicate, and persisted marker/sidecar formats remain intact. `src/index.ts` and the compiled export allowlist are unchanged.

## Integrated Verification

- `npm test` passed: typecheck, dependency boundaries (163 modules, 986 dependencies), 113 test files, and 616 tests.
- Build and compiled package check passed with exactly 407 exports.
- Production search found exactly one `/proc/${pid}/stat` parser and one owner-status `process.kill(pid, 0)` classifier, both in `src/infrastructure/process/process-identity.ts`.
- Executable-reference search confirmed the deleted recovery fixture was unreferenced.

## Implementation Completion

All child stories are `done`; the feature is advanced to `review` for the separate feature review lane. No feature review was performed in this implementation pass, per delegation.

## Review (2026-07-16)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: optional direct malformed-`/proc/stat` no-closing-parenthesis assertion; existing unreadable-token coverage and adapter/integration behavior make it non-blocking.
**Rejected**: none. Accepted the internal-only process utility and unchanged permissive lease-owner schema as intentional scope boundaries.

**Notes**: Standard-weight substrate feature review, one cross-model balanced pass by Umans GLM 5.2. The reviewer independently reproduced typecheck, boundaries (163 modules / 986 dependencies), 113 files / 616 tests, build, and 407 compiled exports; confirmed one production process-start parser/classifier, no remaining dead settlement path or fixture references, unchanged persisted formats/owner states, and no public export drift. No receiver-confirmed material blocker remained, so standard closes after this single pass without re-review.
