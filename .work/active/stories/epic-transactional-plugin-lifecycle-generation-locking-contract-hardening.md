---
id: epic-transactional-plugin-lifecycle-generation-locking-contract-hardening
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock, epic-transactional-plugin-lifecycle-generation-locking-guarded-window]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
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

## Implementation notes
- Execution capability: direct-read inline implementation; the caller explicitly prohibited agents and the hardening surface was kept in one integration/public-boundary ownership set.
- Review weight: standard from the feature design/default policy; this requested run stops at `stage: review`.
- Files changed: `src/index.ts`, `.dependency-cruiser.cjs`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `test/integration/generation-locking.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`, and `test/tooling/boundaries.test.ts`.
- Tests added: real SQLite-backed same-generation competing mutation integration, independent scope lock coverage, exact source/compiled coordination allowlists, type assertions, and a named `node:sqlite` infrastructure-only dependency canary.
- Discrepancies from design: the concrete SQLite factory remains intentionally unexported; the package exposes the portable scheduler/coordinator contracts and lock port while Node composition imports the adapter directly, preventing physical lock paths, connections, retry machinery, and protocol internals from becoming package API.
- Adjacent issues parked: none.

Verification completed: full `npm test` passed: strict production typecheck, dependency boundaries, 80 Vitest files / 478 tests with no type errors, build, and compiled package import (298 exports). Focused coordination/integration checks also passed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 478 tests, real production/test typechecking, clean dependency boundaries, build, and exact 298-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
