---
id: epic-native-plugin-management-marketplace-discovery-adoption-registration-contracts-state
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Define canonical marketplace registration contracts and state

## Checkpoint

Make the existing lifecycle-state generation the sole registration and selected-snapshot authority. Add strict schema-derived registration/candidate/snapshot/cursor IDs, one registration record with origin and refresh evidence, paired state mutation helpers, and lossless host-config/project-state v2→v3 migrations. Consolidate the old marketplace configuration/update record names behind this canonical record without adding persistence.

## Files

- `src/domain/marketplace-registration.ts`
- `src/domain/update-policy.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/project-state.ts`
- `src/application/marketplace-management-contract.ts`
- `src/application/marketplace-update-state.ts`
- `src/domain/error-contract.ts`
- corresponding domain/state contract tests

## Acceptance evidence

- IDs rederive from exact scope/source/snapshot/plugin evidence and cannot alias across scopes or revisions.
- V2 fixtures migrate without losing preference, claim, notification, snapshot, plugin, generation, or pointer evidence; origin is explicitly `legacy`, and unmatched legacy user records are `not-materialized`.
- New add/refresh mutations replace registration and selected snapshot together; migration never fabricates missing snapshot evidence.
- Duplicate root names/source identities and project-local sources fail at the state boundary.
- Public result/error variants are strict discriminated unions inferred from one registry; serialized failures contain no native cause, URL, absolute path, or secret.

## Ordering

Root checkpoint. Registration, refresh, catalog, and adoption consume these contracts.
