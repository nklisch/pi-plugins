---
id: epic-transactional-plugin-lifecycle-generation-locking
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Generation-Safe Mutation Coordination

## Brief

Provide the concurrency contract for lifecycle mutation: in-process serialization by plugin key, cross-process scope locking, and expected-generation compare-and-commit checks around short authoritative-state transitions. Stale results from long-running materialization, inspection, trust, or network work must fail or restart rather than overwrite a newer mutation.

This feature owns coordination policy and lock/generation ports, including cancellation and abandoned-owner behavior. It does not hold locks during source or network work, define lifecycle command semantics, choose immutable storage layout, implement Pi reload, or treat a lock as proof that an external projection activated.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 2 safeguard — lifecycle operations require it before any compare-and-commit mutation
- Depends on state schemas for scope identities and monotonic generation records
- Required guarantees: crash, concurrency, scope, network, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — State layout; Install transaction; Performance and availability
- `docs/ARCHITECTURE.md` — State ports; Installation transaction; Concurrency

## Existing contract references

- `src/application/source-materialization.ts` — cancellable long-running work that must remain outside lifecycle locks
- `src/application/inspection-service.ts` and `src/application/compatibility-service.ts` — pre-commit work whose results may become stale

## Late-bound feature decisions

Lock-file/backend choice, lock ordering, timeout and stale-owner detection, reentrancy policy, fairness, retry surface, generation width, read snapshot token, per-plugin coordinator lifetime, and platform degradation behavior remain for feature design. It must prove no lost update across processes and no deadlock between user/project or multi-plugin operations.

## UI alignment

No UI surface.
