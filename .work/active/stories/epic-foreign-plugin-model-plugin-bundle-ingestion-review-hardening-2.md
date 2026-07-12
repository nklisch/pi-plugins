---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-review-hardening-2
kind: story
stage: implementing
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Reconcile Catalog and Manifest Foreign Claims

## Scope

Close the remaining authority-contract failure in foreign component identity and reconciliation.

## Required fixes

- Derive foreign logical identity from host-independent semantic role within the plugin (native host where inherently host-specific, normalized native kind, and a stable declaration subkey where multiple declarations of one kind are possible), never from source-document JSON Pointer spelling.
- Ensure the same Claude declaration observed through marketplace catalog and plugin manifest maps to one logical component identity even though provenance pointers differ.
- Equivalent catalog/manifest claims merge all provenance into one foreign component. Contradictory claims at the same logical identity return failed `ReadResult` with `CLAIM_CONFLICT`, both declarations, and both source locations.
- Preserve distinct foreign declarations of the same kind only when their semantic subkeys are genuinely different; do not collapse arrays/maps indiscriminately.
- Keep `component-id-v1` verification deterministic and compatible with hook-produced foreign identities.

## Acceptance criteria

- [ ] Equivalent catalog and manifest foreign claims deduplicate into one component with both provenances.
- [ ] Contradictory catalog and manifest claims fail with `CLAIM_CONFLICT` and no bundle.
- [ ] Pointer spelling and document layout do not influence logical identity.
- [ ] Distinct same-kind declarations retain distinct stable identities where the foreign shape supplies semantic subkeys.
- [ ] Hook foreign components continue to verify and reconcile deterministically.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
