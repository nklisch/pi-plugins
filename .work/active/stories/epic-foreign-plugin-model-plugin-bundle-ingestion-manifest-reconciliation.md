---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-inspection-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
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

- [ ] Claude strict/default and Codex require manifests; Claude strict-false permits absence but parses/reconciles a present manifest.
- [ ] Catalog runtime claims are authoritative only for Claude strict-false and supplemental otherwise; all observed contradictions still fail.
- [ ] Claude conventions and Codex manifest-oriented discovery match the matrix; explicit and equivalent conventional locators merge rather than duplicate.
- [ ] Pure readers import no Node/filesystem/application/infrastructure/runtime/Pi modules.
- [ ] Equivalent dual manifests are deterministic and provenance-rich; identity/version/path/config/component conflicts return `CLAIM_CONFLICT` with both source locations and no value.
- [ ] Known unsupported runtime declarations become foreign declarations without verdicts; unknown presentation metadata remains host-qualified.
- [ ] Real paired `nklisch/skills` manifest shapes at recorded commit normalize without inventing components absent from the content contract.
- [ ] Focused tests and full `npm test` pass.

## Out of scope

No skill/hook/MCP file parsing, compatibility assessment, filesystem I/O, runtime activation, or lifecycle behavior.
