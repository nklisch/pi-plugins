---
id: simplify-recovery-ownership-and-reconciliation
kind: feature
stage: drafting
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
- `test/fixtures/recovery/child-journal-writer.mjs` has no caller in the touched test suite.
- The scoped files also contain imports identified by TypeScript's `--noUnusedLocals --noUnusedParameters` diagnostics; remove only those proven unused after the structural cleanup.

**Rationale:** these remnants advertise capabilities and verification paths that do not exist, increasing review cost in security-sensitive recovery code.

## Constraints

- Preserve all public package exports and observable lifecycle, owner-status, journal, retention, cleanup, and deletion behavior.
- Preserve the distinction between missing process identity, unknown owner, released owner, and proven-dead owner; do not turn an uncertain owner into deletion authority.
- Keep process identity infrastructure-only. Domain and application layers remain independent of Node and `/proc`.
- Do not use the cleanup to strengthen validation, change scan-completeness semantics, or add recovery capability; route those as behavior-changing work.
- Verification should cover typecheck, dependency boundaries, existing recovery tests, and package export checks. Add tests only if extraction moves genuinely complex owner-classification behavior behind a new stable interface.
