---
id: epic-foreign-plugin-model-marketplace-ingestion-domain-contracts
kind: story
stage: done
tags: [compatibility]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Add Marketplace Domain Contracts

## Scope

Implement the schema-first unresolved catalog contracts designed in the parent feature. Add `src/domain/marketplace.ts` for normalized marketplace roots, entries, installation policy, host authority, retained catalog declarations, and reader results. These contracts represent declared sources and catalog intent only; they must not fabricate resolved sources, plugin inventories, or compatibility verdicts.

Update `src/index.ts`, `test/public-api.test.ts`, and `test/compiled-package-import.mjs` with an explicit marketplace export allowlist. Keep all TypeScript public types inferred from Zod schemas and keep the domain free of format, infrastructure, application, runtime, Pi, and Node dependencies.

## Acceptance criteria

- [x] `NormalizedMarketplaceSchema` and `NormalizedMarketplaceEntrySchema` enforce root/entry identity agreement, unique entries, unique authority hosts, and unique retained metadata keys.
- [x] `MarketplaceAuthoritySchema` accepts only valid Claude strict and Codex manifest/catalog-authority combinations.
- [x] Entries carry declared `PluginSource`, raw declaration/provenance, availability policy, authorities, retained declarations, and metadata without satisfying `NormalizedPlugin`.
- [x] Every public marketplace type is inferred from a runtime schema and exported explicitly.
- [x] Domain, public API, build, and compiled-package allowlist tests pass.

## Design source

Implement Parent Feature Units 1 and the exact contracts under `## Implementation units`. If an implementation detail must change, preserve schema-first SSOT, unresolved/resolved separation, per-claim provenance, and the public allowlist, then record the deviation here.

## Implementation notes

- Added `src/domain/marketplace.ts` with schema-derived unresolved marketplace, entry, policy, authority, declaration, and read-result contracts.
- Authority refinement enforces Claude strict/default semantics, Claude `strict: false`, and Codex required/supplemental semantics while rejecting Codex strictness.
- Marketplace and entry refinements enforce root identity agreement, duplicate entry keys, duplicate authority hosts, and duplicate retained metadata keys. Declared `PluginSource` remains distinct from resolved plugin sources.
- Added explicit source and compiled-package exports plus focused domain contract coverage. No format, infrastructure, application, runtime, Pi, or Node imports were added.

## Verification

- `npm test` — 12 test files, 123 tests passed; typecheck, dependency boundaries, build, and compiled export allowlist passed.
- Compiled package allowlist contains 81 intended runtime exports.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane story review. Independently confirmed `npm test`: 123 tests, typecheck, dependency boundaries, build, and exact 81-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
