---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening-2
kind: story
stage: done
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Remaining Marketplace Contract Gaps

## Scope

Resolve the three blockers and one important gap reproduced by the final adversarial convergence pass after initial hardening.

## Required fixes

- Replace permissive recursive object acceptance for known runtime/dependency fields with concrete host-aware declaration shapes. Reject empty objects, unknown-only objects, empty hook event declarations, and malformed server/dependency/plugin records atomically at the deepest useful pointer while preserving supported foreign declarations raw.
- Make `ProvenanceLocationSchema.pointer` enforce full RFC 6901 syntax: document root is `""`; non-root pointers are `/`-prefixed reference tokens whose `~` escapes are only `~0` or `~1`.
- Bind host-qualified retained metadata keys to the catalog label (`claude.*` only for Claude input, `codex.*` only for Codex input), in addition to provenance-host checks. Reject mixed/forged keys before reconciliation.
- Tighten GitHub shorthand case-insensitively against `.git` suffixes and use a documented owner/repository lexical grammar that rejects host-invalid owner forms without requiring network lookup.

## Acceptance criteria

- [x] Empty, unknown-only, and malformed nested runtime/dependency objects drop only their entry; supported declaration shapes remain retained raw.
- [x] Public provenance parsing rejects invalid or dangling RFC 6901 escapes while accepting root and escaped tokens.
- [x] Host-mismatched metadata keys fail deterministically even when provenance claims the wrapper host.
- [x] GitHub shorthand rejects `.git` in any case and invalid owner/repository lexical forms.
- [x] Focused regressions plus full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Files changed: `src/formats/marketplace-reader-support.ts`, `src/domain/provenance-location.ts`, `src/formats/claude/marketplace-reader.ts`, `src/formats/marketplace-merger.ts`, and marketplace/provenance regression tests.
- Decisions: replaced recursive JSON acceptance with host-aware field registries and concrete hook, server, settings, dependency, and plugin record validation; recognized fields remain extensible so supported foreign declarations stay raw while empty/unknown-only records fail atomically. Kept optional provenance pointers for existing contracts but enforced complete RFC 6901 grammar whenever present. Bound both root and entry metadata keys to the wrapper host and retained direct-entry checks. Applied GitHub's lexical owner/repository limits with case-insensitive `.git` rejection.
- Raw/provenance behavior: valid declarations retain exact raw payloads and source pointers; malformed entries report deepest useful pointers and valid siblings survive.
- Discrepancies from design: none. No source-materialization or later feature surfaces were touched.
- Adjacent issues parked: none.

## Verification

- `npm test` — passed: 202 tests, typecheck, 152 dependency edges with no violations, build, and exact 91-export compiled package import.
- Independent `npm run build && node test/compiled-package-import.mjs` — passed.
- Independent compiled import/pointer smoke check — passed for `/escaped~1key` and rejected `/bad~2escape`.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane convergence-story review. Independently confirmed `npm test`: 202 tests, typecheck, 152 dependency edges with no violations, build, and exact 91-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.

