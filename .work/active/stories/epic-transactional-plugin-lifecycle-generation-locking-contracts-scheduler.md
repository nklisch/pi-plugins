---
id: epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Define Coordination Contracts and Scope-Qualified Scheduler

## Scope

Establish the portable application contracts for cross-process scope leases and implement the in-process FIFO scheduler that serializes scope-qualified plugin mutations without importing Node or infrastructure.

## Implementation

- Add `ScopeLockLease` and `ScopeLockManager` under `src/application/ports/scope-lock.ts`.
- Add strict `MutationSubject`, `MutationExecutionContext`, and scheduler contracts under `src/application/mutation-coordination.ts`.
- Implement `createKeyedMutationScheduler` in `src/application/keyed-mutation-scheduler.ts`.
- Encode `(ScopeReference, PluginKey)` injectively; reject cross-scope and duplicate subjects; acquire keys canonically and release in reverse.
- Give callbacks an explicit context whose `runNested` rejects held-key overlap and order inversion without importing Node `AsyncLocalStorage`.
- Remove cancelled waiters and idle key queues without converting abort reasons.

## Acceptance criteria

- [ ] Same plugin/scope work is FIFO and mutually exclusive; unrelated plugin/scope work overlaps.
- [ ] Opposite-order multi-plugin requests cannot deadlock.
- [ ] Cancellation before acquisition never invokes work and preserves the exact reason.
- [ ] Throwing/cancelled work releases every key and wakes successors.
- [ ] Cross-scope/duplicate subjects and nested held-key/order violations fail explicitly.
- [ ] Application code remains Node-free and idle scheduler state is reclaimed.
- [ ] Strict production/test typecheck and focused scheduler tests pass.

## Verification

Run focused scheduler tests, direct `tsc -p tsconfig.test.json --noEmit`, dependency boundaries, and the relevant public type assertions.

## Implementation notes
- Execution capability: direct-read inline implementation; the caller explicitly prohibited agents and the scheduler has one cohesive application ownership surface.
- Review weight: standard from the feature design/default policy; this requested run stops at `stage: review`.
- Files changed: `src/application/ports/scope-lock.ts`, `src/application/mutation-coordination.ts`, `src/application/keyed-mutation-scheduler.ts`, and `test/application/keyed-mutation-scheduler.test.ts`.
- Tests added: FIFO same-key serialization, unrelated scope/plugin overlap, canonical multi-key ordering, cancellation identity and queue removal, callback cleanup, nested context checks, and injective key behavior.
- Discrepancies from design: empty scheduler requests are accepted as an explicit no-key context so the generation coordinator can serialize scope-only mutations with its scope lease; ordinary plugin requests still validate one scope and duplicate-free keys.
- Adjacent issues parked: none.

Verification completed: `npm run typecheck`, `npm run boundaries`, and focused scheduler tests (`8 passed`). The repository-wide test typecheck currently has pre-existing unrelated branded-type failures in configuration/trust tests; no scheduler test failure was introduced.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 478 tests, real production/test typechecking, clean dependency boundaries, build, and exact 298-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
