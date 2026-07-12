---
id: epic-foreign-plugin-model-marketplace-ingestion-domain-contracts
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Add Marketplace Domain Contracts

## Scope

Implement the schema-first unresolved catalog contracts designed in the parent feature. Add `src/domain/marketplace.ts` for normalized marketplace roots, entries, installation policy, host authority, retained catalog declarations, and reader results. These contracts represent declared sources and catalog intent only; they must not fabricate resolved sources, plugin inventories, or compatibility verdicts.

Update `src/index.ts`, `test/public-api.test.ts`, and `test/compiled-package-import.mjs` with an explicit marketplace export allowlist. Keep all TypeScript public types inferred from Zod schemas and keep the domain free of format, infrastructure, application, runtime, Pi, and Node dependencies.

## Acceptance criteria

- [ ] `NormalizedMarketplaceSchema` and `NormalizedMarketplaceEntrySchema` enforce root/entry identity agreement, unique entries, unique authority hosts, and unique retained metadata keys.
- [ ] `MarketplaceAuthoritySchema` accepts only valid Claude strict and Codex manifest/catalog-authority combinations.
- [ ] Entries carry declared `PluginSource`, raw declaration/provenance, availability policy, authorities, retained declarations, and metadata without satisfying `NormalizedPlugin`.
- [ ] Every public marketplace type is inferred from a runtime schema and exported explicitly.
- [ ] Domain, public API, build, and compiled-package allowlist tests pass.

## Design source

Implement Parent Feature Units 1 and the exact contracts under `## Implementation units`. If an implementation detail must change, preserve schema-first SSOT, unresolved/resolved separation, per-claim provenance, and the public allowlist, then record the deviation here.
