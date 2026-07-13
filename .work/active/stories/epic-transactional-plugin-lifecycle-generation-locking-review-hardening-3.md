---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening-3
kind: story
stage: done
tags: [correctness, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Retry Concurrent First Initialization Safely

## Scope

Close the reproduced first-initialization TOCTOU in SQLite scope-lock preparation.

## Finding

`prepareDatabase` reads the identity marker and then checks database existence separately. Under two-process first use, a loser can observe `marker === undefined`, be preempted while the winner publishes marker and database, then observe `existing === true` and incorrectly throw a fatal missing-marker error from stale evidence.

## Required fix

Treat contradictory marker/path observations during initialization as a retryable snapshot, not a fatal adapter failure. Re-read the coherent marker/database/claim state on the next cancellable loop iteration while preserving these invariants:

- never adopt an existing database whose marker remains absent after a stable observation;
- never steal a live or unknown initializer;
- reclaim only a proven-dead owner;
- replacement/tamper paths remain fail-closed rather than retrying forever;
- retry remains bounded by caller cancellation with no internal expiry lease.

Add a deterministic scheduling seam or stress fixture that forces marker-absent → winner-publishes → database-present ordering, plus repeated two-process first-use contention proving one committed and one stale with zero adapter failures.

## Acceptance criteria

- [x] The exact stale-marker/fresh-database interleaving retries and succeeds safely.
- [x] Repeated two-process first initialization produces no fatal missing-marker adapter errors.
- [x] Stable orphan database without marker still fails closed.
- [x] Live/unknown and proven-dead initializer policies remain unchanged.
- [x] Replacement/tamper regressions remain green.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: direct inline implementation; the caller explicitly prohibited agents and requested this story advance only to `stage: review`.
- Review weight: `standard` from project/default policy; independent review is intentionally deferred at the requested review boundary.
- Files changed: `src/infrastructure/state/sqlite-scope-lock.ts`, `test/infrastructure/state/sqlite-scope-lock.test.ts`, `test/integration/generation-locking.test.ts`, and this story plus the parent feature summary.
- Tests added/updated: deterministic marker-read interleaving seam proving `absent → ready` retry, stable orphan-marker regression, and 20 repeated real two-process first-use contentions with one committed and one stale result and no adapter failures. Child-process waiters now surface premature exits and stderr instead of hanging.
- Simplification: reused the existing cancellable SQLite acquisition retry loop; no new lease, timer, or fallback path was introduced.
- Discrepancies from design: the stress run also exposed a zero-byte root identity marker race during concurrent manager startup. Root marker publication now uses a complete temporary file plus exclusive hard-link, preserving the existing fail-closed identity contract.
- Adjacent issues parked: none.

Verification: `npm test` passed with strict production/test typechecking, dependency boundaries (124 modules / 676 dependencies), 90 Vitest files / 541 tests with no type errors, build, and compiled package import (319 exports).

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent full-suite verification. Confirmed deterministic stale-marker/fresh-database retry, stable-orphan failure, initializer ownership policy, tamper behavior, and 20-round real multiprocess first-use stress. No blockers, important findings, or nits.
