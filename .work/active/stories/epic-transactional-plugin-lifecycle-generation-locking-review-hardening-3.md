---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening-3
kind: story
stage: implementing
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

- [ ] The exact stale-marker/fresh-database interleaving retries and succeeds safely.
- [ ] Repeated two-process first initialization produces no fatal missing-marker adapter errors.
- [ ] Stable orphan database without marker still fails closed.
- [ ] Live/unknown and proven-dead initializer policies remain unchanged.
- [ ] Replacement/tamper regressions remain green.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
