---
id: epic-foreign-plugin-model-compatibility-reporting-contract-hardening
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-compatibility-reporting
depends_on: [epic-foreign-plugin-model-compatibility-reporting-policy-evaluator, epic-foreign-plugin-model-compatibility-reporting-capability-service]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden the Complete Compatibility Contract

## Scope

Close the parent feature's full `docs/COMPATIBILITY.md` matrix with registry-driven contract fixtures and integration tests. Every compatibility table row, outcome/error matrix row, runtime requirement, default-deny path, and provenance/safety promise must map to a named rule and executable fixture. Integration tests consume representative normalized bundles from existing ingestion mechanics rather than forging reports.

This story may update `docs/COMPATIBILITY.md` only if implementation proves that an existing assertion cannot be represented faithfully by the normalized bundle. It must not implement trust, activation, runtime adapters, lifecycle, configuration collection, or UI.

## Owned files

- `test/fixtures/compatibility/**`
- `test/domain/compatibility-table-contract.test.ts`
- `test/integration/compatibility-reporting.test.ts`
- `test/tooling/boundaries.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `docs/COMPATIBILITY.md` only for an evidence-driven rolling correction

## Acceptance criteria

- [ ] Every parent compatibility grounding row has a unique registry rule id and positive/negative fixture; orphan rules and ungrounded rows fail the table contract test.
- [ ] Skills, every listed hook event/handler behavior, all MCP transports/auth/features, foreign native components, configuration diagnostics, and marketplace diagnostics are covered.
- [ ] Unknown hook/MCP/foreign behavior always yields an explicit incompatible assessment, never omission or an exception.
- [ ] Mixed bundles prove all-or-nothing activation while retaining one assessment per component.
- [ ] Available/unavailable and uncited capabilities prove requirement availability is separate from component verdicts.
- [ ] Reports are deterministic under input permutations and retain exact safe provenance for every diagnostic/requirement.
- [ ] Canary secrets, headers, configured values, environment values, native causes, timestamps, and runtime paths never appear in serialized reports.
- [ ] Full `npm test` passes, including typecheck, dependency boundaries, unit/integration tests, build, and exact compiled exports.

## Verification

Run the registry table contract, integration fixtures, report JSON safety checks, deterministic permutation cases, then the complete package suite. Record any normalized-contract gap explicitly; fail closed rather than inventing support.
