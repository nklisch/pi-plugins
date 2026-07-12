---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts
kind: story
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Establish inspection contracts and stable component identity

## Scope

Implement Unit 1 from the parent feature design: schema-derived bundle-ingestion contracts, the exact manifest-backed content-read port, a pure `ContentIndex`, stable versioned `ComponentId` derivation/verification, reader-set ports, public exports, and executable dependency boundaries.

The content manifest is the only discovery index. Do not add filesystem listing/glob methods or let format readers receive a root path. The application layer imports domain/application only; pure reader implementations are injected later.

## Files

- `src/domain/component-identity.ts`
- `src/domain/bundle-ingestion.ts`
- `src/domain/components.ts`
- `src/application/inspection-contract.ts`
- `src/application/ports/content-read.ts`
- `src/application/ports/bundle-readers.ts`
- `src/application/content-index.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- matching domain/application/public/tooling tests

## Acceptance criteria

- [x] `deriveComponentId` uses the documented injective `component-id-v1` grammar and emits `component-v1:<kind>:<sha256>`; verification and golden vectors cover every component kind.
- [x] Equivalent logical identities are host/order/provenance independent; plugin, kind, and logical-value changes change ids.
- [x] `ContentIndex` validates once and discovers only from `ContentManifest.entries`; explicit missing/symlink/wrong-kind targets fail with provenance and optional absent conventions remain normal.
- [x] `ContentReadPort` reads one exact manifest file entry under one root with a byte bound and exposes no arbitrary/list/glob read.
- [x] Bundle/reader-set contracts derive from schemas or existing inferred contracts without mirrored public interfaces.
- [x] Dependency-cruiser and generated regressions preserve domain/application/format boundaries.
- [x] Typecheck, focused tests, full `npm test`, build, and exact compiled export allowlist pass.

## Out of scope

No host manifest parsing, filesystem adapter, bundle orchestration, compatibility verdict, runtime activation, or lifecycle behavior.

## Implementation notes

- Execution capability: direct inline implementation; this unit has one cohesive domain/application contract surface, and the caller explicitly prohibited nested agents and peeragent.
- Review weight: standard by project default; implementation stops at `stage: review` as requested, with no independent review dispatch because the caller prohibited nested agents and peeragent.
- Files changed: `src/domain/component-identity.ts`, `src/domain/bundle-ingestion.ts`, `src/domain/components.ts`, `src/application/inspection-contract.ts`, `src/application/content-index.ts`, `src/application/ports/content-read.ts`, `src/application/ports/bundle-readers.ts`, `src/index.ts`, `.dependency-cruiser.cjs`, and corresponding domain/application/public/tooling tests.
- Tests added: component-id-v1 golden and injectivity tests; bundle-ingestion schema tests; manifest-backed content-index membership/shape tests; reader injection contract tests; public and compiled export allowlist coverage.
- Verification: `npm test` passed (typecheck, dependency boundaries, 30 Vitest files / 248 tests, build, and compiled import allowlist); independent `npm run build && node test/compiled-package-import.mjs` passed with 111 exports.
- Discrepancies from design: none. The requested Files prose typo was corrected from `},{` to `}`.
- Adjacent issues parked: none.
- The pre-existing modified `.work/bin/work-view` binary was not touched or staged.
