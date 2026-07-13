---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-contract-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Harden Cross-Process Mutation Coordination

## Scope

Close all important findings from deep generation-locking review.

## Required fixes

- Eliminate the public nested scheduler deadlock. Since shipped coordination does not need nesting, prefer removing/narrowing `runNested` rather than preserving an unsound topology; otherwise prove deadlock freedom with the exact parent `[a,b]`, unrelated `[b,c]`, nested `[c]` interleaving.
- Add a real two-process coordinator test against the SQLite lock and shared file-backed generation state proving exactly one same-generation commit and one stale result. Cover process pause, cancellation, and crash release without expiring ownership.
- Prevent SQLite database-path replacement from creating two accepted live owners. Bind initialization to a durable root/database identity marker, verify path identity throughout ownership, never recreate a previously initialized missing/mismatched database silently, and fail closed on replacement.
- Reconcile commit errors/abort after possible durable write while still under the scope lock. Read authority and return typed committed evidence if expected+1 is active; return explicit safe ambiguous/failure evidence otherwise. Never report a bare cancellation that loses a completed commit.
- Runtime-validate every store read/commit response: exact scope and generation; a committed result must equal expected+1. Malformed adapter output fails closed.
- Remove hard-coded project-key prefixes, make platform support claims honest/fail-closed, and ensure tests describe the layer actually exercised.

## Acceptance criteria

- [x] No supported scheduler API admits the reproduced nested head-of-line deadlock.
- [x] Child-process integration proves no lost update through the real coordinator and SQLite lock.
- [x] Database path replacement cannot yield two owners accepted by coordination.
- [x] Commit-then-throw/abort preserves typed committed evidence after reconciliation.
- [x] Forged scope/generation store responses are rejected.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes
- Execution capability: direct-read inline implementation; the caller explicitly prohibited agents and requested this story stop at `stage: review`.
- Review weight: standard from the project/default policy; no independent review was invoked because the caller prohibited agents.
- Files changed: `src/application/mutation-coordination.ts`, `src/application/keyed-mutation-scheduler.ts`, `src/application/generation-mutation-coordinator.ts`, `src/infrastructure/state/sqlite-scope-lock.ts`, `src/infrastructure/state/local-lock-filesystem.ts`, `src/index.ts`, `test/application/keyed-mutation-scheduler.test.ts`, `test/application/generation-mutation-coordinator.test.ts`, `test/infrastructure/state/sqlite-scope-lock.test.ts`, `test/integration/generation-locking.test.ts`, `test/fixtures/locking/child-generation-coordinator.mjs`, `test/fixtures/locking/source-loader.mjs`, `test/public-api.test.ts`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, and the generation-locking feature/work records.
- Tests added: exact nested-deadlock reproducer closure, forged load/commit scope and generation responses, commit-then-throw and commit-then-abort reconciliation, missing/replaced database fail-closed reproducers, platform-scoped capability policy, and real two-process coordinator/SQLite/shared-file generation tests for normal contention, pause/cancellation, and crash release.
- Discrepancies from design: the shipped scheduler no longer exposes `MutationExecutionContext` or `runNested`; the unused recursive capability was removed instead of retaining a topology that could deadlock. Project database names now encode the complete validated key rather than depending on a domain prefix.
- Adjacent issues parked: none.

Verification completed: `npm test` passed with production and test typechecking, dependency boundaries (120 modules / 661 dependencies), 90 Vitest files / 520 tests with no type errors, build, and compiled package import (318 exports).

## Review (2026-07-13)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed real two-process coordination, replacement fail-closed behavior, commit reconciliation, strict adapter validation, 520 tests, clean typechecking/boundaries, build, and exact 318-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
