---
id: epic-foreign-plugin-model-marketplace-ingestion-review-hardening
kind: story
stage: review
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-domain-contracts, epic-foreign-plugin-model-marketplace-ingestion-claude-reader, epic-foreign-plugin-model-marketplace-ingestion-codex-reader, epic-foreign-plugin-model-marketplace-ingestion-dual-catalog-merge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Marketplace Reader and Merger Contracts

## Scope

Resolve the accepted findings from the marketplace-ingestion feature's two-phase deep review. Keep the normalized domain contract and capability boundary intact while tightening nested declaration validation, canonical path equivalence, provenance, metadata retention, host identity, diagnostics, and fixture-backed regression coverage.

## Required fixes

- Define field-specific structural validation for known nested runtime and dependency declarations. Malformed nested values invalidate the whole entry while siblings survive; valid declarations remain raw and receive no compatibility verdict.
- Normalize accepted repository subdirectory spellings (`plugin` and `./plugin`) to one declared domain path while preserving exact foreign spelling in provenance. Equivalent cross-host entries must merge.
- Use RFC 6901 root semantics: empty pointer for document root, with schema support, or omit the pointer consistently. Preserve escaped field pointers.
- Retain Claude/Codex `category`, `tags`, and other promised presentation fields as host-qualified `RetainedMetadata` with raw declarations and pointers.
- Validate Claude GitHub shorthand as exactly `owner/repository`; reject or intentionally normalize `.git`, extra segments, fragments, and malformed values before URL synthesis.
- Preserve raw plugin-array indexes through entry parsing so duplicate diagnostics cite original declarations even when earlier entries fail.
- Bind `MarketplaceCatalogInput.nativeHost` to the normalized result's source documents, authorities, diagnostics, entries, and claim provenance; mislabeled or mixed-host inputs fail before merge.
- Load every committed marketplace fixture in tests and assert normalized identities, sources, metadata, provenance, diagnostics, sibling survival, and dual merge behavior rather than smoke-parsing only.

## Acceptance criteria

- [ ] Malformed nested declarations drop only the affected entry and match foundation error semantics.
- [ ] Bare and `./` repository subdirectories normalize equivalently and merge without conflict while raw declarations remain distinct.
- [ ] Document-root provenance uses valid RFC 6901 semantics and all nested pointers remain correct.
- [ ] Presentation metadata is retained with exact host-qualified keys, values, pointers, and raw declarations.
- [ ] Malformed GitHub shorthand and duplicate declarations are rejected/reported at their original locations.
- [ ] Mislabeled or mixed-host merger inputs fail deterministically.
- [ ] All committed marketplace fixtures execute as contract tests.
- [ ] `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Files changed: `src/formats/marketplace-reader-support.ts`, both marketplace readers, `src/formats/marketplace-merger.ts`, source/provenance domain contracts, marketplace docs, and marketplace/domain tests.
- Tests added: committed-fixture contract coverage for all Claude/Codex and dual catalog fixtures; nested declaration atomicity, original indexes, GitHub shorthand grammar, path aliasing, metadata, host binding, and direct merger API regressions.
- Discrepancies from design: none; repository subdirectory paths are canonicalized to the bare form while raw source declarations remain in provenance.
- Adjacent issues parked: none.

## Verification

- `npm test` — passed (184 tests, typecheck, dependency boundaries, build, and 91-export compiled package allowlist).
- Independent `npm run build` plus compiled marketplace-schema import — passed.
