---
id: epic-foreign-plugin-model-source-materialization-review-hardening-3
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Marketplace SHA and Recursive Limit Gaps

## Scope

Close two residual source-materialization certification findings.

## Required fixes

- Apply authoritative SHA-shaped Git `ref` binding to marketplace source declarations exactly as for plugin Git sources. When no separate authoritative SHA overrides it, a full 40-hex declared ref must equal the resolved marketplace revision.
- Enforce disk-manifest entry budgets before hashing or appending every recursive entry, not only when reserving immediate children. Previously enumerated siblings must not be processed after descendants consume the remaining budget.
- Keep deterministic traversal and exact configured limit semantics.

## Acceptance criteria

- [ ] A marketplace Git SHA-shaped ref cannot resolve to a different revision.
- [ ] Recursive trees perform no hashing beyond `maxEntries`; rejection occurs before processing the first over-budget entry.
- [ ] Flat and nested exact-boundary cases remain deterministic.
- [ ] Full `npm test`, build, boundaries, and compiled package import pass.
