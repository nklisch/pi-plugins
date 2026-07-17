---
id: epic-native-plugin-management-inspection-diagnostics-candidate-inspection
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-safe-display-redaction, epic-native-plugin-management-inspection-diagnostics-snapshot-evidence]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Inspect exact marketplace candidates read-only

## Checkpoint

Resolve a candidate only by its exact scope/registration/candidate/catalog snapshot, inspect a complete callback-scoped transient bundle, and evaluate compatibility against the captured capability snapshot. Derive safe trust/configuration needs without promotion, persistence, activation, or runtime probing.

## Files

- `src/application/ports/inspection-candidate-content.ts`
- `src/application/native-candidate-inspection.ts`
- `src/composition/inspection-candidate-content.ts`
- `test/application/native-candidate-inspection.test.ts`
- `test/composition/inspection-candidate-content.test.ts`

## Acceptance evidence

- Candidate identity/source/revision/provenance has no cross-scope/name/latest fallback.
- Existing bundle inspection and compatibility policy produce the complete inventory/report.
- Marketplace-relative candidates inspect offline; external offline acquisition is safely unavailable.
- Scratch is removed on success/failure/abort and never becomes selected cache or installed authority.
- Mid-read catalog/trust/capability/runtime changes return stale.

## Implementation notes

- Added exact candidate routing over registration/candidate/catalog-snapshot identity; every resolved field is cross-checked against the scope-qualified detail subject with no name/latest fallback.
- Candidate bytes use the existing hardened materializer and bundle inspector inside a callback-scoped allocation. Cleanup runs with a fresh signal on success, failure, and abort; no promotion or authority mutation is reachable.
- Compatibility is the existing pure evaluator over the packaged capability capture. Trust/configuration are projected only from exact, value-free readiness evidence; missing capabilities retain complete inventory as unavailable.
- Added the registry-backed diagnostic compilation foundation so all acquisition/catalog failures return stable safe categories and never native messages or causes.
- Verification: `npm run typecheck`; focused candidate/application and staging-composition suites (5 tests), including stale return and cleanup on every outcome.
