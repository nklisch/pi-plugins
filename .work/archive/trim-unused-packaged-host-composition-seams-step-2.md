---
id: trim-unused-packaged-host-composition-seams-step-2
kind: story
stage: done
tags: [refactor, infra]
parent: trim-unused-packaged-host-composition-seams
depends_on: [trim-unused-packaged-host-composition-seams-step-1]
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Remove Unconsumed Packaged Host Composition Values

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** elimination / dead weight

Remove composition outputs, inputs, and locals that are computed or declared but never consumed by production. Keep all actual path authorities, runtime selection verification seams, authoritative state reads, and startup ordering unchanged.

## Files

- `src/composition/plugin-host-paths.ts`
- `src/composition/runtime-desired-state.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`

## Current State

```ts
export type PluginHostPathPlan = Readonly<{
  hostRoot: string;
  stateRoot: string;
  lockRoot: string;
  configurationRoot: string;
  configurationDatabase: string;
  stagingRoot: string;
  storesRoot: string;
  dataRoot: string;
  generatedRoot: string;
  recoveryRoot: string;
  journalRoot: string;
  leaseRoot: string;
  retentionRoot: string;
  stateDatabase(scope: ScopeReference): string;
}>;

export async function buildRuntimeDesiredState(input: Readonly<{
  scopes?: readonly GenerationSnapshot[];
  // live dependencies
}>, signal: AbortSignal) {
  void input.scopes;
}

const observations = successor === undefined
  ? await reload.reconcileCurrent(signal)
  : await reload.acceptSuccessor(successor, signal);
void observations;
```

Production reference search finds no reader for the nine extra path fields or `scopes`. The startup local is immediately discarded. `RuntimeSelectionCatalog.snapshot()` is deliberately retained because complete-reload tests use it to verify candidate rollback.

## Target State

```ts
export type PluginHostPathPlan = Readonly<{
  hostRoot: string;
  stateRoot: string;
  lockRoot: string;
  configurationRoot: string;
  stateDatabase(scope: ScopeReference): string;
}>;

export async function buildRuntimeDesiredState(input: Readonly<{
  // live dependencies only
}>, signal: AbortSignal) { /* same authoritative reads */ }

if (successor === undefined) await reload.reconcileCurrent(signal);
else await reload.acceptSuccessor(successor, signal);
```

## Implementation Notes

- Delete `configurationDatabase`, `stagingRoot`, `storesRoot`, `dataRoot`, `generatedRoot`, `recoveryRoot`, `journalRoot`, `leaseRoot`, and `retentionRoot` only from the plan. Actual adapters continue deriving their unchanged layouts from `hostRoot`.
- Retain `hostRoot`, `stateRoot`, `lockRoot`, `configurationRoot`, and `stateDatabase` exactly.
- Remove the one contract assertion that reads only deleted `journalRoot`; keep all real host/state/lock/project-digest/collision assertions.
- Retain `RuntimeSelectionCatalog.snapshot()` and its rollback assertions; it is a useful verification seam rather than production ownership.
- Remove the ignored `scopes` property and import fallout; preserve authoritative user/current-project reads.
- Await the same startup branch directly so ordering and errors remain identical.

## Acceptance Criteria

- [ ] Every remaining `PluginHostPathPlan` field has a production reader, and all existing filesystem path spellings remain unchanged.
- [ ] Runtime selection rollback verification remains unchanged.
- [ ] Desired state still rereads user and exact trusted current-project authority; no ignored override exists.
- [ ] Startup awaits and propagates the same reconciliation result without an unused local.
- [ ] Packaged host contract, desired-state/catalog, startup/recovery, typecheck, and boundary tests pass.

## Risk and Rollback

Risk is low because all removed values are internal, have no production reader, and change no package export or persisted path/schema. Revert this story's commit to restore the dead surface.

## Implementation Notes

- Execution capability: direct inline implementation; all removals were explicit dead values at four bounded composition/test sites.
- Review weight: not applicable; this child story is a verification checkpoint and does not enter review.
- Files changed: `src/composition/plugin-host-paths.ts`, `src/composition/runtime-desired-state.ts`, `src/composition/create-packaged-plugin-host.ts`, and `test/composition/packaged-plugin-host-contract.test.ts`.
- Tests updated: removed only the contract assertion for the deleted unused `journalRoot` output; path authority, project digest, collision, desired-state, rollback, and startup/recovery coverage remain.
- Simplification: removed nine path-plan fields and computations, the ignored desired-state `scopes` input and `GenerationSnapshot` import plumbing, and the discarded startup observation binding (net 25 lines deleted for this step).
- Verification: focused packaged-host path, desired-state, selection rollback, SQLite state, startup/recovery, disposal, and complete-reload coverage passed (15 tests); typecheck and dependency boundaries passed.
- Discrepancies from design: none.
- Adjacent issues parked: none.
