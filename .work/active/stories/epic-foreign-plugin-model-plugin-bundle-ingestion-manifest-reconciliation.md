---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation
kind: story
stage: done
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Read and reconcile host manifests

## Scope

Implement Unit 2 from the parent feature design: pure Claude/Codex plugin-manifest readers, shared normalized manifest claims, a dedicated dual-manifest merger, and authority-aware catalog/manifest/conventional discovery planning over `ContentIndex`.

Apply the exact authority matrix in the parent. Authority controls manifest requirements and convention eligibility, never silent precedence. Equivalent claims merge provenance, complementary claims combine, and every contradictory overlapping claim invalidates the complete bundle with both provenances.

## Files

- `src/formats/plugin-manifest.ts`
- `src/formats/claude/manifest-reader.ts`
- `src/formats/codex/manifest-reader.ts`
- `src/formats/manifest-merger.ts`
- `src/application/discovery-plan.ts`
- matching format/application fixtures and tests

## Acceptance criteria

- [x] Claude strict/default and Codex require manifests; Claude strict-false permits absence but parses/reconciles a present manifest.
- [x] Catalog runtime claims are authoritative only for Claude strict-false and supplemental otherwise; all observed contradictions still fail.
- [x] Claude conventions and Codex manifest-oriented discovery match the matrix; explicit and equivalent conventional locators merge rather than duplicate.
- [x] Pure readers import no Node/filesystem/application/infrastructure/runtime/Pi modules.
- [x] Equivalent dual manifests are deterministic and provenance-rich; identity/version/path/config/component conflicts return `CLAIM_CONFLICT` with both source locations and no value.
- [x] Known unsupported runtime declarations become foreign declarations without verdicts; unknown presentation metadata remains host-qualified.
- [x] Real paired `nklisch/skills` manifest shapes at recorded commit normalize without inventing components absent from the content contract.
- [x] Focused tests and full `npm test` pass.

## Out of scope

No skill/hook/MCP file parsing, compatibility assessment, filesystem I/O, runtime activation, or lifecycle behavior.

## Implementation notes

- Execution capability: direct-read only; this is one cohesive pure-format/application unit and the caller prohibited other agents.
- Review weight: standard by project default; explicit stop at `stage: review` because the caller requested that transition and prohibited other agents.
- Files changed: `src/domain/bundle-ingestion.ts`, `src/formats/plugin-manifest.ts`, `src/formats/claude/manifest-reader.ts`, `src/formats/codex/manifest-reader.ts`, `src/formats/manifest-merger.ts`, `src/application/discovery-plan.ts`, and matching format/application tests plus committed real-manifest fixtures.
- Tests added: pure Claude/Codex reader tables, real paired `nklisch/skills` snapshots, dual-manifest reconciliation/conflict tests, authority/convention discovery-plan tests, and catalog-versus-manifest contradiction coverage.
- Discrepancies from design: the shared `PluginManifestClaims` contract already lived in `src/domain/bundle-ingestion.ts` from the prerequisite story, so `src/formats/plugin-manifest.ts` re-exports the format-facing types and keeps manifest paths in a shared domain registry to preserve the application/format boundary.
- Adjacent issues parked: none.
- Verification: `npm test`; independent `npm run build && node test/compiled-package-import.mjs`.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane manifest reconciliation review. Independently confirmed `npm test`: 265 tests, typecheck, 215 dependency edges with no violations, build, and exact 111-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
