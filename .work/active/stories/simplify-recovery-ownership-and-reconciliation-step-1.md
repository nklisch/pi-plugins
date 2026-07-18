---
id: simplify-recovery-ownership-and-reconciliation-step-1
kind: story
stage: done
tags: [refactor, infra]
parent: simplify-recovery-ownership-and-reconciliation
depends_on: []
release_binding: 0.1.0
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Make the Transition Reconciler the Sole Settlement Owner

## Value

**Priority:** High
**Risk:** Medium
**Source lens:** elimination / dead weight

Delete the unreachable second lifecycle settlement engine and the reconciler dependency it never reads. Observable lifecycle outcomes remain owned by the existing `createLifecycleTransitionReconciler` path.

## Files

- `src/application/plugin-lifecycle-service.ts`
- `src/application/lifecycle-transition-reconciler.ts`

## Current State

```ts
// plugin-lifecycle-service.ts
const MAX_PENDING_REBASE_ATTEMPTS = 2;
class FinalizationFailure extends Error { /* ... */ }
function matchesIntermediateRecord(/* ... */): boolean { /* ... */ }
async function commitPendingReplacement(/* ... */) { /* ... */ }
async function finalize(/* ... */) { /* ... */ }
async function rollback(/* ... */) { /* ... */ }

// The actual operation path bypasses those helpers.
const reconciled = await reconciler.completeCommittedTransition(/* ... */);

// lifecycle-transition-reconciler.ts
export type LifecycleTransitionReconcilerDependencies = Readonly<{
  mutations: GenerationMutationCoordinator;
  state: { read(/* ... */): Promise<StateLoadResult> };
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  installed: InstalledPluginLoader;
  sha256: Sha256;
}>;
```

Symbol search verifies `commitPendingReplacement`, `finalize`, and `rollback` are confined to the dead local chain. `installed` is declared by the reconciler but never read.

## Target State

```ts
const reconciler = createLifecycleTransitionReconciler({
  state: dependencies.state,
  mutations: dependencies.mutations,
  reload: dependencies.reload,
  transitions: dependencies.transitions,
  sha256: dependencies.sha256,
});

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

export type LifecycleTransitionReconcilerDependencies = Readonly<{
  mutations: GenerationMutationCoordinator;
  state: { read(scope: ScopeContext, signal: AbortSignal): Promise<StateLoadResult> };
  reload: LifecycleReloadPort;
  transitions: LifecycleTransitionStore;
  sha256: Sha256;
}>;
```

## Implementation Notes

- Re-run symbol search, then remove `FinalizationFailure`, `MAX_PENDING_REBASE_ATTEMPTS`, `targetWithoutPending`, `matchesIntermediateRecord`, `isActiveExpectation`, `commitPendingReplacement`, `finalize`, and `rollback` from the lifecycle service.
- Retain `withPending`, `withoutPending`, `replaceTarget`, `reloadAndObserve`, and `PluginLifecycleServiceDependencies.installed`; first commit and previous-projection preparation still use them.
- Remove the reconciler's `InstalledPluginLoader` import/property and composition argument only. Do not modify reconciliation, rebasing, settlement, recovery marking, or result mapping.
- Remove import fallout proven unused after deletion, including current candidates `ProjectionExpectationSchema`, `GenerationSchema`, and `CandidatePreparationResult`.

## Acceptance Criteria

- [ ] `createLifecycleTransitionReconciler` is the sole post-commit completion/rollback owner; no local duplicate chain remains in `plugin-lifecycle-service.ts`.
- [ ] Reconciler dependency construction/types omit `installed`; the lifecycle service's installed loader remains intact for its live callers.
- [ ] `test/application/plugin-lifecycle-service.test.ts` passes all lifecycle, rollback, rebase, and recovery-required cases unchanged.
- [ ] `test/application/lifecycle-transition-reconciler.test.ts` and `test/integration/plugin-lifecycle.test.ts` pass unchanged.
- [ ] Typecheck, boundaries, build, and the 407-export package check pass.

## Risk and Rollback

The risk is deleting a helper that appears structurally similar to the live reconciler but has a hidden callback. The pre-delete symbol search and unchanged lifecycle tests bound that risk. Revert this story's commit to restore the dead path and unused dependency; there is no persisted-data effect.

## Implementation Notes

- Removed the unreachable local pending-transition finalization and rollback chain from `plugin-lifecycle-service.ts`; the live post-commit path remains delegated to `createLifecycleTransitionReconciler`.
- Removed the reconciler's unused installed-loader dependency and import. The lifecycle service still retains its installed loader for previous-revision projection preparation.
- Removed only import and helper fallout proven unused by symbol search and typecheck.

## Verification

- Symbol search: no local duplicate settlement helpers or reconciler `installed` dependency remain.
- Focused tests: `npm run test:unit -- test/application/plugin-lifecycle-service.test.ts test/application/lifecycle-transition-reconciler.test.ts test/integration/plugin-lifecycle.test.ts` (3 files, 10 tests passed).
- `npm run typecheck` passed.
- `npm run boundaries` passed (162 modules, 984 dependencies).

## Completion

Step 1 is complete and behavior-preserving.
