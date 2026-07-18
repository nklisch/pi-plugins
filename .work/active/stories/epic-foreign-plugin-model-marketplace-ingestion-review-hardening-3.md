---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-3
kind: story
stage: done
tags: [compatibility, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening-2]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Close Nested Policy and GitHub Grammar Gaps

## Scope

Close two residual blockers reproduced by the final adversarial marketplace review.

## Required fixes

- Validate recognized nested MCP OAuth/authentication fields and plugin installation/policy fields by their actual foreign value types. Values such as `clientId: {}` and `installation: {}` must invalidate the complete entry at the deepest useful pointer while valid host declarations remain raw and auditable.
- Correct the lexical GitHub repository grammar so valid leading-dot repository names such as `.github` are accepted while empty names, dot segments, forbidden suffixes, control/URL syntax, extra path segments, and `.git` suffixes in any case remain rejected.
- Replace the incorrect regression that classifies `owner/.repository` as universally host-invalid with verified grammar examples.

## Acceptance criteria

- [x] Malformed nested OAuth and installation-policy value types drop only their entry with exact diagnostics.
- [x] Valid `.github`-style repository names map correctly; invalid GitHub shorthand remains rejected.
- [x] Both Claude and Codex declaration registries receive equivalent malformed-nested regression coverage where fields overlap.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Files changed: `src/domain/source.ts`, `src/formats/claude/marketplace-reader.ts`, `src/formats/marketplace-reader-support.ts`, `test/domain/source.test.ts`, `test/formats/claude/marketplace-reader.test.ts`, `test/formats/codex/marketplace-reader.test.ts`.
- Tests added: deepest-pointer OAuth and nested policy type regressions for both host readers; valid raw declaration retention; shared GitHub shorthand grammar coverage including leading-dot repositories and invalid dot segments/suffixes/control/URL forms.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm test` passed 218 tests, typecheck, dependency boundaries, build, and compiled package import; independent `npm run build && node test/compiled-package-import.mjs` passed with 94 exports.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane residual-hardening story review. Independently confirmed `npm test`: 218 tests, typecheck, 152 dependency edges with no violations, build, and exact 94-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
