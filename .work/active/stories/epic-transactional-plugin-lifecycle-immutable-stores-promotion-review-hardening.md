---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-review-hardening
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-18
---

# Harden Immutable and Projection Cleanup Boundaries

## Scope

Close confirmed promotion cleanup findings and execute every interrupted adversarial candidate reproducer.

## Required fixes

- Reclaim the sealed prepared `.pending-*` directory when `renameNoReplace` loses an identical race and returns verified `already-present`.
- Implement explicit bottom-up permission restoration before removing sealed prepared trees on cancellation/error. Never silently swallow cleanup failure; return or throw safe typed cleanup evidence without paths/native causes.
- Normalize missing marker/metadata inspection failures to fixed content-verification errors and simplify dead identity branches.
- Execute and resolve exact candidate reproducers from the interrupted adversarial review:
  - replace a projection allocation directory with a symlink to a foreign tree before sealing; sealing must reject without mutating the foreign tree;
  - nested files named `READY`/`metadata.json` must participate in content digest and read-only sealing; only root control files are excluded;
  - project-scoped installed revision resolution must preserve/validate exact project scope and never default to user scope.
- Add race, post-seal cancellation/failure, cleanup-failure redaction, symlink swap, nested-control, and project-scope regressions.

## Acceptance criteria

- [x] Identical concurrent promotions leave no loser-owned pending directory.
- [x] Every post-seal exit either removes prepared content or returns safe explicit cleanup evidence.
- [x] Projection sealing revalidates allocation identity/nofollow containment immediately before publication.
- [x] Nested control-name files are hashed and sealed immutable.
- [x] Content resolution preserves exact user/project scope.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: direct host implementation; no agents or peer mechanisms were used, per caller instruction.
- Review weight: standard; implementation stops at `stage: review` for the requested isolated-snapshot reviewer handoff.
- Files changed: `src/infrastructure/filesystem/prepared-tree-cleanup.ts`, immutable promotion cleanup/marker verification, projection allocation verification/hash/sealing/cleanup, explicit scoped plugin resolution, and focused infrastructure tests.
- Tests added: identical publication-race cleanup, post-seal cancellation and cleanup redaction, projection symlink-swap rejection, nested control-name hashing/sealing, normalized marker errors, and project-scope resolution regressions.
- Discrepancies from design: persisted installed revision records remain scope-free envelopes, so `resolvePlugin` now requires the authoritative scope as an explicit argument rather than defaulting to user scope; the port contract was tightened accordingly.
- Adjacent issues parked: none.
- Verification: `npm test` passes with 90 test files / 539 tests, production typecheck, dependency boundaries, build, and compiled package import (319 exports).

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent full-suite verification. Confirmed all five acceptance criteria and every interrupted adversarial candidate through 539 tests, strict production/test typechecking, clean boundaries, build, and exact 319-export package import. No blockers, important findings, or nits.
