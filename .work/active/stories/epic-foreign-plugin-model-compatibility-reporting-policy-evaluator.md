---
id: epic-foreign-plugin-model-compatibility-reporting-policy-evaluator
kind: story
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Build the Registry-Driven Compatibility Evaluator

## Scope

Implement the pure domain policy and evaluation contracts in the parent feature. Preserve `ComponentVerdictRegistry`, `RuntimeRequirementStatusRegistry`, `deriveActivatable`, and `createCompatibilityReport` as the compatibility graph and activatability single sources of truth. Add one typed registry for accepted skill, hook, MCP, foreign, configuration, and marketplace semantics plus the complete runtime capability vocabulary.

The evaluator consumes only a validated normalized plugin, a complete immutable capability snapshot, and optional marketplace policy context. It emits exactly one assessment for every flattened component, deterministic requirement assessments and diagnostics, and a final report validated by the existing report factory. It performs no probes, I/O, activation, trust, configuration collection, or runtime calls.

## Owned files

- `src/domain/compatibility.ts`
- `src/domain/compatibility-policy.ts`
- `src/domain/compatibility-evaluator.ts`
- `src/index.ts`
- `test/domain/compatibility.test.ts`
- `test/domain/compatibility-policy.test.ts`
- `test/domain/compatibility-evaluator.test.ts`
- relevant public/compiled export assertions

## Acceptance criteria

- [ ] The registry is the only enumeration of runtime capability ids and accepted compatibility semantics; schemas, dispatch, descriptions, ranks, and tests derive from it.
- [ ] All `ComponentKindRegistry` variants dispatch exhaustively and every flattened component receives exactly one same-id assessment.
- [ ] Hook, MCP, and foreign evaluation defaults to incompatible for unknown behavior; known presentation metadata is warning-only.
- [ ] Supported components cite deterministic provenance-rich runtime requirements; availability never changes the supported verdict.
- [ ] Configuration and optional marketplace policy add diagnostics only and cannot create pseudo-components/requirements or override activatability.
- [ ] Output ordering and JSON are deterministic and safe; no raw secret-bearing declaration is copied into diagnostic details.
- [ ] The evaluator calls `deriveActivatable` and `createCompatibilityReport` rather than duplicating their invariants.
- [ ] Existing compatibility mechanics tests and new registry/evaluator tables pass.

## Verification

Run focused domain tests first, then typecheck and public export tests. Exercise available/unavailable capability permutations, complete mixed inventories, unknown hook/MCP/foreign declarations, configuration/marketplace diagnostics, deterministic ordering, provenance, and secret canaries.

## Implementation notes
- Execution capability: direct-read only; this cohesive domain change was implemented in the host context without nested agents or peeragent.
- Review weight: standard, with the caller-requested boundary left at `stage: review`.
- Files changed: `src/domain/compatibility-policy.ts`, `src/domain/compatibility-evaluator.ts`, `src/index.ts`, `test/domain/compatibility-policy.test.ts`, `test/domain/compatibility-evaluator.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`.
- Tests added: registry completeness/snapshot tests, mixed-bundle evaluator tables, unavailable-capability behavior, safe diagnostic canaries, deterministic ordering, and public/compiled export assertions.
- Discrepancies from design: none.
- Adjacent issues parked: none.
