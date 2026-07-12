---
id: epic-transactional-plugin-lifecycle-generation-locking-contract-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock, epic-transactional-plugin-lifecycle-generation-locking-guarded-window]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Generation Coordination Across Processes and Package Boundaries

## Scope

Converge the scheduler, SQLite scope lock, generation coordinator, state store, public package, dependency rules, and foundation assertions through adversarial multi-process integration tests and exact export checks.

## Implementation

- Add `test/integration/generation-locking.test.ts` with shared-state and child-process race harnesses.
- Prove only one same-scope process enters the critical window, then one commit/one stale result for same-generation contenders; prove permitted concurrency for unrelated subjects/scopes.
- Extend `src/index.ts`, source/compiled export allowlists, and dependency-cruiser canaries with only intended coordination contracts/factories.
- Keep SQLite database paths, connections, protocol rows, retry timers, and native errors private.
- Roll `docs/SPEC.md` and `docs/ARCHITECTURE.md` forward only where exact landed names or filesystem support limits clarify current assertions.

## Acceptance criteria

- [ ] Real process contention proves mutual exclusion, crash release, pause without expiry, cancellation, and no lost update.
- [ ] A losing operation cannot report promotion/commit success.
- [ ] User/project and unrelated plugin operations exhibit only required serialization.
- [ ] Exact source and compiled package allowlists expose no physical lock internals.
- [ ] Dependency rules reject Node/outer imports from application coordination and non-infrastructure lock implementations.
- [ ] Foundation docs state SQLite/local-filesystem support limits without overclaiming fairness, timeout, or network-filesystem safety.
- [ ] Full `npm test` passes strict source/test typecheck, boundaries, all runtime/integration tests, build, and compiled import.

## Verification

Run the full global suite plus direct test typecheck and repeat the race-focused child-process tests enough to expose cleanup or ownership flakiness without replacing deterministic IPC barriers with sleeps.
