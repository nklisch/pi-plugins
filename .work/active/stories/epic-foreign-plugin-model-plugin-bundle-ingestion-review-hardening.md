---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-review-hardening
kind: story
stage: review
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-service-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Complete Bundle Inventory and Error Boundaries

## Scope

Resolve all accepted blocker and important findings from the feature's two-model deep review.

## Required fixes

- Consume `DiscoveryPlan.catalogForeign` so catalog-authoritative and supplemental unsupported runtime declarations remain in the final foreign inventory with provenance; never silently discard them.
- Replace name-fragment heuristics for unknown manifest fields with an explicit behavior-neutral presentation allowlist. Every other unknown field defaults to foreign runtime inventory, including executable-looking objects.
- Catch invalid UTF-8 in manifest-indexed `SKILL.md` and `agents/openai.yaml` content at the value boundary and return failed `ReadResult` with no partial bundle; retain thrown boundary behavior only for untrustworthy handoff/adapter failures and preserve abort.
- Make foreign components produced from unknown hook-handler fields derive IDs from the same declaration identity represented by their provenance. Valid unknown runtime fields must survive as inventory rather than failing final ID verification.
- Forward `NodePluginInspectorOptions.limits` consistently to inspection-service reads for manifests, hooks, and MCP documents; configured bounds must be effective end to end.
- Add the designed `test/application/inspection-service.test.ts` and `test/application/bundle-reconciler.test.ts` with isolated fatality and merge/conflict matrices, including configuration, kind mismatch, foreign inventory, locator conflicts, result/throw/abort distinctions, and order determinism.
- Execute committed invalid-UTF8 and prototype/duplicate-key adversarial fixtures rather than leaving them orphaned.

## Acceptance criteria

- [x] Catalog-only unsupported declarations appear in final foreign inventory with exact provenance.
- [x] Unknown manifest fields are metadata only when explicitly allowlisted as presentation; all other valid JSON is foreign inventory.
- [x] Invalid UTF-8 skill and presentation YAML returns a failed result without throwing or partial value.
- [x] Unknown hook fields produce valid, verifiable, deterministic foreign component IDs.
- [x] Custom manifest/hooks/MCP byte limits reject oversized documents.
- [x] Focused service and reconciler unit suites cover every branch named above and all adversarial fixtures are exercised.
- [x] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes
- Execution capability: inline single-owner implementation; the changes converge in the inspection/reconciliation composition path, and the caller prohibited nested agents and peeragent.
- Review weight: standard (default); implementation stops at the requested `stage: review` boundary.
- Files changed: `src/application/discovery-plan.ts`, `src/application/inspection-service.ts`, `src/application/bundle-reconciler.ts`, `src/composition/create-plugin-inspector.ts`, `src/formats/plugin-manifest.ts`, `src/formats/hook-reader-support.ts`, `test/application/inspection-service.test.ts`, `test/application/bundle-reconciler.test.ts`, `test/formats/claude/manifest-reader.test.ts`.
- Tests added: focused service and reconciler branch matrices; catalog foreign inventory, strict presentation classification, invalid UTF-8 result handling, hook identity verification, configured byte limits, boundary/abort distinctions, locator conflicts, configuration, determinism, and execution of invalid-UTF8, prototype-key, and duplicate-key fixtures.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm test` passed (46 files, 313 tests, typecheck, dependency boundaries, build, and compiled package import); independent `npm run build && node test/compiled-package-import.mjs` passed (114 exports).
