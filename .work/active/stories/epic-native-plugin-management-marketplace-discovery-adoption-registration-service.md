---
id: epic-native-plugin-management-marketplace-discovery-adoption-registration-service
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-registration-contracts-state, epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement atomic scoped marketplace registration and removal

## Checkpoint

Implement add/remove/list over the existing materializer, marketplace inspector, immutable content store, project trust, lifecycle state, scope lock, and generation CAS. Catalog root name is authoritative; source-derived registration identity controls mutation; registration and selected snapshot commit together.

## Files

- `src/application/marketplace-registration-service.ts`
- `src/application/marketplace-state.ts`
- `src/application/ports/marketplace-registration.ts`
- focused application and integration tests

## Acceptance evidence

- Add prepares outside locks, promotes verified content, and commits root-name registration plus snapshot in one generation.
- Same source/scope is unchanged; same name/different source and changed name/same source are exact conflicts.
- Same marketplace/plugin names in user and current project remain separate and deterministically listable with no precedence.
- Project add requires current trust and portable remote source; it does not write `.pi/plugins.json`.
- Remove is registration-ID/source checked, idempotent when absent, blocks sorted installed dependents, and delegates bytes to existing collection.
- Abort, stale/lost/ambiguous commit, two-process add, and add/remove races never report success from promotion alone or corrupt selected state.

## Implementation notes

- Added one scoped registrar over existing materialization, inspection, immutable promotion, generation coordination, current-project trust, and lifecycle state ports.
- Catalog root names are authoritative; source-derived IDs drive idempotency and conflict checks. Promotion alone never proves registration, and lost races reconcile only against selected state.
- Add/repair publishes registration plus selected snapshot together. Remove rechecks the exact registration under coordination, retries one refresh race, blocks sorted installed dependents, and leaves bytes to collection.
- List projects deeply frozen, path-free user/current-project views with exact declared/resolved source, snapshot token, Git validator, no-ETag, freshness, and explicit unavailable/corrupt/not-materialized status.

## Verification

- Focused registration service suite: 3 passed, 0 failed.
- Integrated concurrency/security suites also exercise duplicate add, removal, local canonicalization, and project trust.
