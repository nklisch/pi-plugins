---
id: epic-foreign-plugin-model-compatibility-reporting-contract-hardening
kind: story
stage: done
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

- [x] Every parent compatibility grounding row has a unique registry rule id and positive/negative fixture; orphan rules and ungrounded rows fail the table contract test.
- [x] Skills, every listed hook event/handler behavior, all MCP transports/auth/features, foreign native components, configuration diagnostics, and marketplace diagnostics are covered.
- [x] Unknown hook/MCP/foreign behavior always yields an explicit incompatible assessment, never omission or an exception.
- [x] Mixed bundles prove all-or-nothing activation while retaining one assessment per component.
- [x] Available/unavailable and uncited capabilities prove requirement availability is separate from component verdicts.
- [x] Reports are deterministic under input permutations and retain exact safe provenance for every diagnostic/requirement.
- [x] Canary secrets, headers, configured values, environment values, native causes, timestamps, and runtime paths never appear in serialized reports.
- [x] Full `npm test` passes, including typecheck, dependency boundaries, unit/integration tests, build, and exact compiled exports.

## Verification

Run the registry table contract, integration fixtures, report JSON safety checks, deterministic permutation cases, then the complete package suite. Record any normalized-contract gap explicitly; fail closed rather than inventing support.

## Implementation notes

- Execution capability: direct-read only; the change was implemented in the host context without nested agents or peeragent.
- Review weight: standard; caller explicitly requested the implementation boundary at `stage: review`.
- Files changed: `src/domain/compatibility-policy.ts`, `src/domain/compatibility-evaluator.ts`, `test/fixtures/compatibility/common.ts`, `test/fixtures/compatibility/skills.ts`, `test/fixtures/compatibility/hooks.ts`, `test/fixtures/compatibility/mcp.ts`, `test/fixtures/compatibility/foreign.ts`, `test/fixtures/compatibility/configuration-marketplace.ts`, `test/fixtures/compatibility/reporting.ts`, `test/domain/compatibility-table-contract.test.ts`, `test/integration/compatibility-reporting.test.ts`, and this story.
- Tests added: registry-exhaustive positive/negative rule fixtures, all listed hook events and handlers, all MCP transports/auth/features/default-deny cases, foreign/configuration/marketplace tables, real-reader normalized-bundle integration, mixed activation, availability separation, deterministic permutations, provenance assertions, safe serialization canaries, and adapter/caller outcome coverage.
- Discrepancies from design: none. The compatibility policy/evaluator received narrow contract corrections for Codex invocation-policy objects, unsupported hook-handler routing, nested MCP fail-closed validation, and report-safe provenance/explanations. `docs/COMPATIBILITY.md` was unchanged because every documented row was representable by the normalized contract or exercised through its explicit foreign/default-deny path.
- Adjacent issues parked: none.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane contract-hardening review. Independently confirmed 347 tests, clean typecheck and dependency boundaries, build, and exact 131-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
