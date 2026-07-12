---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Recovery Journal and Revision Collection

## Brief

Record enough durable pending-transition evidence to determine whether an interrupted lifecycle operation should finalize the candidate or restore the previous active revision. Startup recovery removes abandoned staging, inspects exact generation/revision/projection evidence, isolates corrupt records, and reuses lifecycle invariants rather than creating a second mutation engine.

Retain inactive immutable revisions while active state, pending transitions, or existing-session grace policy may reference them, then collect only unreferenced expired content. Persistent plugin data remains outside collection and is never deleted as revision garbage. This feature does not perform network refresh, runtime component execution, UI reporting, or redefine lifecycle command semantics.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 4 resilience — update policy depends on its interruption and retention guarantees
- Depends on lifecycle operations so replay/compensation shares one transaction contract
- Required guarantees: crash, concurrency, scope, data, and ports guarantees plus reload verification seams in the parent epic

## Foundation references

- `docs/SPEC.md` — Install transaction; State layout; Performance and availability
- `docs/ARCHITECTURE.md` — Installation transaction; Revision retention and recovery

## Existing contract references

- `src/domain/content-manifest.ts` — immutable content evidence
- `src/domain/errors.ts` — stable diagnostic/error conventions

## Late-bound feature decisions

Journal schema/version, write-ahead sequence, fsync and atomicity protocol, recovery status machine, indeterminate reload handling, quarantine strategy, startup time budget, session-liveness evidence, grace period, collection traversal, retry/backoff, and corruption diagnostics remain for feature design. Collection must be reference-driven and idempotent; uncertain evidence retains content and reports rather than guessing.

## UI alignment

No UI surface. Recovery status is exposed as typed results for later presentation.
