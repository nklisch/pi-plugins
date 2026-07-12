---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-5
kind: story
stage: review
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening-4]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Complete Derived and Conflicting Provenance Handling

## Scope

Close two reproducible provenance-integrity findings from final marketplace certification.

## Required fixes

- When `metadata.pluginRoot` contributes to a normalized marketplace-relative source path, include both the root `/metadata/pluginRoot` declaration and the entry `/plugins/<index>/source` declaration in the source claim provenance, with exact host/source document and raw values.
- When two provenance claims identify the same native host and exact location but carry unequal declarations, do not silently deduplicate one. Reject the contradiction with a typed claim conflict or preserve both as an explicit auditable discrepancy consistent with normalized schema invariants. Exact duplicate claims may collapse.
- Preserve deterministic order across readers and direct/catalog merging.

## Acceptance criteria

- [x] Derived plugin-root paths carry complete root-plus-entry provenance in Claude and Codex readers.
- [x] Same-location conflicting raw declarations cannot disappear silently; exact duplicates still deduplicate.
- [x] Provenance ordering remains deterministic across input permutations.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Execution capability: inline host implementation; the reader and merger changes are cohesive and the caller prohibited nested delegation.
- Review weight: standard (default; implementation stops at the requested `review` stage).
- Files changed: `src/formats/marketplace-reader-support.ts`, both marketplace readers, `src/formats/marketplace-merger.ts`, `src/domain/provenance.ts`.
- Tests added: plugin-root provenance regressions for Claude and Codex; direct and catalog same-location conflict regressions; permutation stability; exact-duplicate and typed-conflict provenance coverage.
- Discrepancies from design: none. Source materialization and later lifecycle surfaces were not touched.
- Adjacent issues parked: none.
- Verification: reproduced both certification failures before implementation; `npm test` passed 234 tests with typecheck, boundaries, build, and compiled package import; independent `npm run build && node test/compiled-package-import.mjs` passed.
