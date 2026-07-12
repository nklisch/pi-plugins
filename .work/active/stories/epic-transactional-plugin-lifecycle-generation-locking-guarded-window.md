---
id: epic-transactional-plugin-lifecycle-generation-locking-guarded-window
kind: story
stage: review
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
- Fix execution order: validate one-scope request → keyed scheduler → scope lock → state read/generation check → cancellation/ownership check → prepared critical callback → opaque mutation membership/scope/generation verification → cancellation/ownership check → store commit → release.
- Never invoke the callback for an already-stale generation.
- Require the callback to return an opaque `VerifiedStateMutation`; it cannot commit directly and no callback runs after commit.
- Convert any store stale result into the outer stale result so callers cannot report success.
- Preserve abort and cleanup/error behavior exactly; a release failure after commit throws typed `CommittedMutationCleanupError` with commit evidence so callers do not retry.

## Acceptance criteria

- [ ] Initial stale state skips callback/promotion and returns expected/actual generation.
- [ ] Wrong-scope, wrong-generation, unverified, duplicate-plugin, or missing mutation output never reaches the store.
- [ ] Lease loss before callback or commit prevents commit.
- [ ] Store-level stale defense cannot be ignored or converted to success.
- [ ] Successful execution invokes callback/store once, returns committed snapshot/value, and releases all ownership.
- [ ] Empty plugin lists work only as scope-level serialized mutations; one-scope user/project equality is structural and validated.
- [ ] Abort, callback, adapter, and release failures follow the designed propagation rules; post-commit cleanup failure retains committed value/snapshot.

## Verification

Use deterministic fakes to assert exact call order and held ownership, then run direct test typecheck and application dependency boundaries.

## Implementation notes
- Execution capability: direct-read inline implementation; the coordinator is a single application policy boundary and the caller prohibited agents.
- Review weight: standard from the feature design/default policy; this requested run stops at `stage: review`.
- Files changed: `src/application/generation-mutation-coordinator.ts` and `test/application/generation-mutation-coordinator.test.ts`.
- Tests added: stale-before-callback, exact critical call ordering, opaque mutation/scope/generation validation, store-level stale conversion, ownership loss, empty scope mutation, duplicate plugin rejection, and typed cleanup failures with committed evidence.
- Discrepancies from design: failed state loads are surfaced as a redacted `BoundaryError(ADAPTER_FAILED)` because the existing store port exposes corruption only as a failed load result and the coordinator result union has no corruption branch; no lock/store contract was widened.
- Adjacent issues parked: none.

Verification completed: `npm run typecheck`, `npm run boundaries`, and scheduler/SQLite/coordinator focused tests (`19 passed`). The repository-wide test typecheck still reports pre-existing unrelated branded-type failures in configuration/trust tests; no coordinator test failure was introduced.
