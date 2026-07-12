---
id: epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge
kind: story
stage: implementing
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

- [ ] Root identity conflict is typed root-fatal and includes both locations; entry source/version/description/policy conflicts produce diagnostics and omit only that entry.
- [ ] Canonically equivalent sources merge despite different raw declarations, while ref/SHA/npm-selector differences conflict.
- [ ] Caller order and catalog entry order cannot change final entries, diagnostics, authority/declaration ordering, or provenance ordering.
- [ ] Existing reader diagnostics precede merger diagnostics in deterministic Claude-then-Codex order.
- [ ] The marketplace merger has no manifest-merger behavior or outer-layer imports.
- [ ] Dependency-boundary regressions, dual-catalog fixtures, full `npm test`, build, and compiled package import pass.

## Design source

Implement Parent Feature Unit 4 and its testing matrix. This story is the integration gate for both reader stories and may adjust private helpers, but not the normalized contract or root/entry fatality rules without recording a design correction in the parent.
