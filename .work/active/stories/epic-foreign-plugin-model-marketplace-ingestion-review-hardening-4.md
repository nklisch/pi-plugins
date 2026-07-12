---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-4
kind: story
stage: implementing
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

- [ ] Missing pointer, root pointer `""`, and empty-property pointer `/` remain distinct provenance claims.
- [ ] Direct entry merging rejects every host-mismatched claim surface and forged metadata key.
- [ ] Valid direct entry merges remain deterministic and schema-valid.
- [ ] Full `npm test`, build, boundaries, and compiled package import pass.
