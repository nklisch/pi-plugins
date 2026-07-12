---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-review-hardening-2
kind: story
stage: review
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

- [x] Equivalent catalog and manifest foreign claims deduplicate into one component with both provenances.
- [x] Contradictory catalog and manifest claims fail with `CLAIM_CONFLICT` and no bundle.
- [x] Pointer spelling and document layout do not influence logical identity.
- [x] Distinct same-kind declarations retain distinct stable identities where the foreign shape supplies semantic subkeys.
- [x] Hook foreign components continue to verify and reconcile deterministically.
- [x] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes

- Execution capability: inline single-owner implementation; the caller prohibited nested agents and peeragent, and the identity/reconciliation changes share one cohesive boundary.
- Review weight: standard (default); implementation stops at the requested `stage: review` boundary.
- Files changed: `src/domain/foreign-identity.ts`, `src/domain/component-identity.ts`, `src/domain/components.ts`, `src/domain/bundle-ingestion.ts`, `src/formats/foreign-declaration.ts`, `src/formats/plugin-manifest.ts`, `src/formats/manifest-merger.ts`, `src/formats/hook-reader-support.ts`, `src/application/discovery-plan.ts`, `src/application/bundle-reconciler.ts`, and the focused/integration regression suites.
- Tests added: reproduced and then fixed equivalent catalog/manifest duplication and contradictory success; added semantic map subkey, same-kind distinct-subkey, hook pointer-layout, and end-to-end catalog/manifest regressions with conflict claim/location assertions.
- Discrepancies from design: the prior pointer-based `declarationKey` contract became explicit `declarationSubkey`; keyed maps and multi-item lists are split only where their shapes supply semantic members, while scalar/plain-object declarations use the default role.
- Adjacent issues parked: none.
- Verification: `npm test` passed (46 files, 320 tests, typecheck, dependency boundaries, build, and exact 114-export compiled package import). Independent `npm run build && node test/compiled-package-import.mjs` passed.
