---
id: epic-native-plugin-management-marketplace-discovery-adoption-catalog-query
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-registration-service, epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Project deterministic offline catalogs and candidates

## Checkpoint

Build request-local catalog projection over selected immutable marketplace snapshots. Provide bounded token search, deterministic sorting, snapshot-bound pagination, safe details, and an internal branded exact candidate resolver for later inspection/install capabilities. Add no network call, parsed-catalog cache, database, or persisted search index.

## Files

- `src/application/marketplace-catalog-contract.ts`
- `src/application/marketplace-catalog-service.ts`
- `src/application/marketplace-search.ts`
- focused search/catalog tests

## Acceptance evidence

- Offline search uses only selected verified snapshots and has stable scope/marketplace/plugin/version/ID order independent of prior completion order.
- NFKC/lowercase/token matching searches only safe presentation fields; query/token/limit bounds and filters are enforced.
- Opaque cursors bind query plus ordered generation/snapshot fingerprint; malformed and stale cursors fail without skips/duplicates.
- Same identities across scopes stay separate and require exact candidate ID/snapshot token; there is no fallback or implicit precedence.
- Safe detail exposes exact declared/resolved source, full marketplace revision, content binding, and claim locations without raw executable declarations.
- Internal resolve re-verifies content and IDs, deep-freezes the exact normalized entry/context, and returns stale/missing/unavailable outcomes rather than trusting caller roots or entries.
- One corrupt/missing source does not hide valid siblings and never triggers network fallback.
