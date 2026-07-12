---
id: epic-foreign-plugin-model-source-materialization-review-hardening-3
kind: story
stage: review
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

- [x] A marketplace Git SHA-shaped ref cannot resolve to a different revision.
- [x] Recursive trees perform no hashing beyond `maxEntries`; rejection occurs before processing the first over-budget entry.
- [x] Flat and nested exact-boundary cases remain deterministic.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Execution capability: inline implementation; the application binding and disk rewalk limit are cohesive, localized changes with focused regressions.
- Review weight: standard, caller-directed stop at `stage: review`.
- Files changed: `src/application/source-materialization.ts`, `src/infrastructure/filesystem/secure-content-writer.ts`, `test/application/source-materialization.test.ts`, `test/infrastructure/filesystem/secure-content-writer.test.ts`.
- Tests added: forged marketplace Git SHA-shaped ref rejection; nested recursive over-budget hashing regression; nested exact-boundary deterministic traversal regression.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Reproduced before implementation: the marketplace coordinator accepted a resolved revision different from a full SHA-shaped marketplace `ref`; a nested tree hashed an enumerated sibling after descendants exhausted the configured entry budget.
- Verification: `npm test` passed 26 files and 237 tests, including typecheck, dependency boundaries, build, and compiled package import; independent `npm run build && node test/compiled-package-import.mjs` passed with 94 exports.
