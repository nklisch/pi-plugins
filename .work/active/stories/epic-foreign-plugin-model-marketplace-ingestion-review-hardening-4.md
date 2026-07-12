---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-4
kind: story
stage: done
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening-3]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Provenance and Direct-Merge Boundaries

## Scope

Close two residual merger-boundary failures reproduced after nested-policy hardening.

## Required fixes

- Make provenance deduplication distinguish an omitted pointer from every present RFC 6901 pointer, including `/`. Use an injective key or validated canonical serialization; do not collapse root, absent, or empty-property locations.
- Apply native-host binding to the public `mergeMarketplaceEntries` path, not only catalog wrappers. Reject mismatched host provenance across identity, source, version, policy, authorities, declarations, raw declarations, metadata, and diagnostics before merging.
- Preserve deterministic order and canonical source comparison for valid direct-entry calls.

## Acceptance criteria

- [x] Missing pointer, root pointer `""`, and empty-property pointer `/` remain distinct provenance claims.
- [x] Direct entry merging rejects every host-mismatched claim surface and forged metadata key.
- [x] Valid direct entry merges remain deterministic and schema-valid.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Reproduced the omitted-pointer/`/` collision and direct source-provenance forgery with regression tests before applying fixes.
- Made location keys injective with explicit JSON encoding for optional pointer, line, and column fields.
- Centralized complete entry host binding for catalog and public direct-entry merges, covering nested claims, authority/declaration host labels, metadata keys, and catalog diagnostics.
- Added exhaustive direct claim-surface and pointer-distinction tests in `test/formats/marketplace-merger.test.ts`.
- Files changed: `src/formats/marketplace-merger.ts`, `test/formats/marketplace-merger.test.ts`, this story.
- Verification: `npm test` passed 223 tests, typecheck, dependency boundaries, build, and compiled package import; independent build/import verification also passed.
- Deviations: none. No source materialization or later ingestion surfaces were changed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane merger-boundary story review. Independently confirmed `npm test`: 223 tests, typecheck, 152 dependency edges with no violations, build, and exact 94-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
