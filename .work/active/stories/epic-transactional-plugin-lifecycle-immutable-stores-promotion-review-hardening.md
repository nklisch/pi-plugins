---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-review-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
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

- [ ] Identical concurrent promotions leave no loser-owned pending directory.
- [ ] Every post-seal exit either removes prepared content or returns safe explicit cleanup evidence.
- [ ] Projection sealing revalidates allocation identity/nofollow containment immediately before publication.
- [ ] Nested control-name files are hashed and sealed immutable.
- [ ] Content resolution preserves exact user/project scope.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
