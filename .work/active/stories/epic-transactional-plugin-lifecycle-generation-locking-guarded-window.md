---
id: epic-transactional-plugin-lifecycle-generation-locking-guarded-window
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Coordinate the Generation-Guarded Mutation Window

## Scope

Compose the keyed scheduler, cross-process scope lease, and existing `LifecycleStateStore` into a prepared mutation service that checks generation before promotion work and makes the store commit the final compare-and-swap authority.

## Implementation

- Add `src/application/generation-mutation-coordinator.ts` with `PreparedMutationRequest`, callback context/result, result union, and factory.
- Fix execution order: keyed scheduler → scope lease → state read/generation check → ownership assertion → prepared critical callback → mutation scope/generation verification → ownership assertion → store commit → release.
- Never invoke the callback for an already-stale generation.
- Require the callback to return an opaque `VerifiedStateMutation`; it cannot commit directly and no callback runs after commit.
- Convert any store stale result into the outer stale result so callers cannot report success.
- Preserve abort and cleanup/error behavior exactly.

## Acceptance criteria

- [ ] Initial stale state skips callback/promotion and returns expected/actual generation.
- [ ] Wrong-scope, wrong-generation, unverified, duplicate-plugin, or missing mutation output never reaches the store.
- [ ] Lease loss before callback or commit prevents commit.
- [ ] Store-level stale defense cannot be ignored or converted to success.
- [ ] Successful execution invokes callback/store once, returns committed snapshot/value, and releases all ownership.
- [ ] Empty plugin lists work only as scope-level serialized mutations; user/project equality is structural and validated.
- [ ] Abort, callback, adapter, and release failures follow the designed propagation rules.

## Verification

Use deterministic fakes to assert exact call order and held ownership, then run direct test typecheck and application dependency boundaries.
