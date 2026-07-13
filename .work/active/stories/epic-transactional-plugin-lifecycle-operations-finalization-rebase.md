---
id: epic-transactional-plugin-lifecycle-operations-finalization-rebase
kind: story
stage: review
tags: [correctness, tests]
parent: epic-transactional-plugin-lifecycle-operations
depends_on: [epic-transactional-plugin-lifecycle-operations-project-scope-wiring]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Rebase Finalization Across Unrelated Scope Mutations

## Scope

Prevent ordinary concurrent activity on another plugin from stranding a successfully reloaded or rolled-back transition.

## Finding

After the first pending-state commit, reload occurs outside the scope lock. Another Pi session may mutate plugin B and advance the shared scope generation while plugin A's exact record and pending reference remain unchanged. Plugin A finalization/rollback currently uses its old generation once, receives stale, and returns `recovery-required` with a pending marker despite successful activation/restoration.

## Required fix

For finalization and rollback only, handle stale generation by re-reading authoritative scope state and performing the same bounded target-state rebase used by the first commit:

- retry only when plugin A's record, selected revision/activation expectation, and exact pending transition reference still match the expected intermediate state;
- reject/recovery-require when the target plugin or pending reference changed, disappeared, or became corrupt;
- never repeat reload or promotion during rebase;
- keep retries bounded and return `recovery-required` if ordinary contention continues beyond the bound;
- preserve independent plugin B changes in the replacement mutation.

## Acceptance criteria

- [x] Plugin B generation advancement during successful plugin A reload rebases A finalization and clears its pending marker.
- [x] The same unrelated advancement during failed-reload rollback rebases restoration and clears pending evidence.
- [x] Changes to plugin A or its pending reference prevent rebase and return safe recovery-required/conflict outcome.
- [x] Rebase never repeats promotion or reload.
- [x] User/project scope behavior remains isolated.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes
- Execution capability: direct host implementation; the caller prohibited agents and this is one cohesive post-commit lifecycle change.
- Review weight: standard; the caller requested the story advance from implementing to review.
- Files changed: `src/application/plugin-lifecycle-service.ts`, `test/application/plugin-lifecycle-service.test.ts`.
- Tests added/removed: successful-finalization and failed-reload-restoration regressions with concurrent plugin-B generation changes, plus target-change recovery coverage; no tests removed.
- Simplification: finalization and rollback now share one bounded pending-replacement commit helper, preserving unrelated records while avoiding duplicate promotion or reload work.
- Discrepancies from design: none.
- Adjacent issues parked: none.
