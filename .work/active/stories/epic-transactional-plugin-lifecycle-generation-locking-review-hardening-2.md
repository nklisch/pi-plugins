---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening-2
kind: story
stage: review
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Close Recursive and Durable-Outcome Locking Gaps

## Scope

Close five blocker/important findings from final adversarial generation-locking review.

## Required fixes

- Prevent same-scheduler recursive acquisition by callback closure from deadlocking. Detect execution context and reject any overlapping recursive request synchronously/at entry with a fixed typed error; disjoint recursion must either be rejected uniformly or proven safe. Do not rely on callback arity.
- Make lazy SQLite database initialization crash-recoverable. An `initializing` marker must carry owner/process identity and be reclaimed only after proving the owner is dead; live/unknown ownership fails closed and remains cancellable. Add kill-between-marker-and-finalize recovery.
- Parse full `GenerationSnapshot` contracts, including required pointers/documents, rather than accepting `{scope,generation}`. Commit-error reconciliation must prove the intended mutation's resulting snapshot/content, not infer it from generation `expected+1` alone. Introduce a mutation/result fingerprint or exact expected resulting evidence sufficient to distinguish unrelated generation advance.
- Close path-marker TOCTOU by binding the opened SQLite handle/database identity to the durable marker and verifying that exact identity before and during ownership. Replacement between open, `BEGIN IMMEDIATE`, and marker reread cannot yield two accepted owners.
- Preserve `commit-failed`/`commit-ambiguous` classification and observed safe evidence when release also fails; cleanup errors must compose without discarding durable-outcome information.
- Add exact recursive closure, stranded initializer crash, malformed full snapshot, unrelated generation advance, open/begin/path replacement, and release-after-ambiguity reproducers.

## Acceptance criteria

- [x] Recursive same-key scheduler acquisition fails immediately without deadlock.
- [x] Killed initializer cannot permanently strand a scope and live initializer cannot be stolen.
- [x] Only complete validated snapshots are accepted.
- [x] Reconciliation never reports committed for an unrelated generation advance.
- [x] Database replacement cannot produce two accepted leases across any acquisition boundary.
- [x] Cleanup failure preserves durable commit classification/evidence.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: direct inline implementation; the caller explicitly prohibited agents and requested the story advance to `stage: review` while its parent remains `stage: implementing`.
- Files changed: `src/application/keyed-mutation-scheduler.ts`, `src/application/ports/mutation-execution-context.ts`, `src/infrastructure/state/keyed-mutation-scheduler.ts`, `src/application/generation-mutation-coordinator.ts`, `src/infrastructure/state/sqlite-scope-lock.ts`, `src/index.ts`, `test/application/keyed-mutation-scheduler.test.ts`, `test/application/generation-mutation-coordinator.test.ts`, `test/infrastructure/state/sqlite-scope-lock.test.ts`, `test/integration/generation-locking.test.ts`, `test/fixtures/locking/child-generation-coordinator.mjs`, `test/fixtures/locking/child-initializing-marker.mjs`, and `test/compiled-package-import.mjs`.
- Recursive closure ownership now travels through an injected execution-context port; the Node adapter uses `AsyncLocalStorage`, keeping application policy portable while rejecting overlapping recursive keys at entry.
- Initialization markers and claims carry PID plus `/proc` start-time identity; only a proven-dead owner permits reclaim. A private hard-link alias binds each opened SQLite handle to the marked inode, with marker/path checks before `BEGIN IMMEDIATE` and throughout lease ownership.
- Store snapshots are strict complete user/project envelopes. Reconciliation applies the verified mutation to the pre-commit snapshot and compares all state documents, rather than treating `expectedGeneration + 1` as proof. Cleanup errors retain non-committed outcome classification and observed safe snapshots.
- Exact reproducers cover synchronous/disjoint recursive closure, live and killed initializers, malformed snapshots, unrelated generation advance, marker/path replacement, multiprocess crash release, and ambiguous commit followed by failed release.

Verification: `npm test` passed: production/test typechecking, dependency boundaries (123 modules / 672 dependencies), 90 Vitest files / 530 tests with no type errors, build, and compiled package import (319 exports).
