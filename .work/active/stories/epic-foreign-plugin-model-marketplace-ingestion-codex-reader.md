---
id: epic-foreign-plugin-model-marketplace-ingestion-codex-reader
kind: story
stage: done
tags: [compatibility]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read Codex Marketplace Catalogs

## Scope

Implement the pure Codex catalog reader described in the parent. Parse native `.agents/plugins/marketplace.json` catalogs plus documented Claude-compatible string-path entries, map installation policy exactly, synthesize manifest-required/catalog-supplemental authority with provenance, and retain presentation, runtime, and dependency declarations without assigning compatibility verdicts.

Share pure path and JSON Pointer support with the Claude reader; do not import the Claude host reader itself. Do not read `.codex/config.toml`, inspect manifests, access materialized paths, or depend on Node/infrastructure.

## Acceptance criteria

- [x] Native local and Git-subdirectory sources plus Claude-compatible string paths map into shared declared-source claims.
- [x] `AVAILABLE`, `INSTALLED_BY_DEFAULT`, and `NOT_AVAILABLE` map exactly; missing or unknown installation policy drops only the affected entry.
- [x] Every entry carries valid Codex authority and cannot carry Claude strictness.
- [x] Root-fatal, entry-recoverable, no-partial-entry, path syntax, raw declaration, and JSON Pointer behavior match the shared contract.
- [x] Runtime/dependency declarations and host-qualified presentation metadata remain available for later bundle/compatibility policy.
- [x] Native, Claude-compatible, and adversarial fixture suites pass without Node or outer-layer imports.

## Implementation notes

- Files changed: `src/formats/codex/marketplace-reader.ts`, `test/formats/codex/marketplace-reader.test.ts`, `test/fixtures/marketplaces/codex-valid.json`, `test/fixtures/marketplaces/codex-partial.json`.
- Tests added: native local and Git-subdirectory mappings, Claude-compatible paths, all installation states, Codex authority, strictness rejection, malformed policy/runtime isolation, source/path diagnostics, and JSON boundary errors.
- Discrepancies from design: none; the reader accepts the documented native `local`/`git-subdir` forms and the verified Claude-compatible string-path form.
- Adjacent issues parked: none.

## Verification

- Focused Codex reader tests — 4 tests passed.
- `npm test` before final bundle verification — 14 test files, 131 tests passed; typecheck, dependency boundaries, build, and compiled export allowlist passed.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Integrated verification with both readers independently passed `npm test`: 131 tests, typecheck, dependency boundaries, build, and exact 81-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.

## Design source

Implement Parent Feature Unit 3. If verified Codex fixtures differ from the surveyed schema, preserve the shared output and document the evidence and narrowly added reader variant here rather than weakening root identity or entry atomicity.
