---
id: epic-native-plugin-management-marketplace-discovery-adoption-catalog-query
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-registration-service, epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

- Added request-local projection over exact selected immutable snapshots. Every read re-resolves content, reconstructs and verifies resolved source evidence, and uses the existing marketplace inspector; no network client, parsed cache, index, or cursor state was added.
- Search uses bounded NFKC/lowercase/token normalization over safe identity, description, version, category/tag/interface claims and deterministic user-before-project/code-point ordering.
- Base64url cursors bind canonical filters plus exact scope generation/snapshot fingerprints. Invalid and changed-state cursors fail explicitly.
- Serializable details omit raw declarations and authentication/runtime material. The internal resolver re-derives all IDs and deep-freezes the exact normalized entry plus verified snapshot context; packaged public composition does not expose that brand.
- Missing/corrupt selected content is isolated as an observation, with valid siblings retained and no older/network fallback.

## Verification

- Search/catalog focused tests are included in the 44-test focused application bundle, all green.
- Deterministic ordering, normalization bounds, pagination continuity, cursor staleness, offline resolution, exact detail/resolve, and unavailable content are covered.
