---
id: epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler
kind: story
stage: implementing
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
