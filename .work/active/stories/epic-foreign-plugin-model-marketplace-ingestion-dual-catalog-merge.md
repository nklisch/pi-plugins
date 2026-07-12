---
id: epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge
kind: story
stage: done
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-claude-reader, epic-foreign-plugin-model-marketplace-ingestion-codex-reader]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Merge Dual Marketplace Catalogs Deterministically

## Scope

Implement the dedicated pure marketplace merger and format-boundary enforcement. Merge already-normalized Claude and Codex catalogs in canonical host order, require the same root-declared marketplace identity, compare plugin sources through canonical source serialization including selectors, combine equivalent claims/provenance, and drop only conflicting overlapping entries while preserving valid siblings.

Keep this merger separate from the future manifest merger. Extend dependency-cruiser and its executable regression so all `src/formats/**` code is independent of Node, infrastructure, application, runtime, and Pi.

## Acceptance criteria

- [x] Root identity conflict is typed root-fatal and includes both locations; entry source/version/description/policy conflicts produce diagnostics and omit only that entry.
- [x] Canonically equivalent sources merge despite different raw declarations, while ref/SHA/npm-selector differences conflict.
- [x] Caller order and catalog entry order cannot change final entries, diagnostics, authority/declaration ordering, or provenance ordering.
- [x] Existing reader diagnostics precede merger diagnostics in deterministic Claude-then-Codex order.
- [x] The marketplace merger has no manifest-merger behavior or outer-layer imports.
- [x] Dependency-boundary regressions, dual-catalog fixtures, full `npm test`, build, and compiled package import pass.

## Design source

Implement Parent Feature Unit 4 and its testing matrix. This story is the integration gate for both reader stories and may adjust private helpers, but not the normalized contract or root/entry fatality rules without recording a design correction in the parent.

## Implementation notes

- Added `src/formats/marketplace-merger.ts` as a pure dual-catalog reconciliation boundary. Inputs are validated and sorted Claude-then-Codex; root name disagreement is a `MARKETPLACE_ROOT_INVALID` `BoundaryError`, while entry claim conflicts become `CLAIM_CONFLICT` diagnostics and remove only the overlapping entry.
- Canonical source serialization decides source equivalence, preserving both host declarations in provenance. Version, description, policy, authority, declaration, metadata, raw declaration, source-document, entry, and diagnostic ordering are canonicalized for caller/entry-order independence.
- Added dual equivalent/conflicting JSON fixtures and focused merger coverage for source equivalence, selector/source conflict, root fatality, sibling survival, provenance, and permutation determinism.
- Added `formats-no-outer-or-node-imports` dependency-cruiser regression coverage without exporting the format merger through the package barrel.

## Verification

- `npm test` passes: typecheck, dependency boundaries, 24 Vitest files / 174 tests, build, and compiled package import allowlist.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test`: 174 tests, typecheck, 141 dependency edges with no violations, build, and exact 90-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
