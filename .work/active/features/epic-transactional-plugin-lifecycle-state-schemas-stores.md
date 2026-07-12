---
id: epic-transactional-plugin-lifecycle-state-schemas-stores
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Versioned State Schemas and Stores

## Brief

Define the schema-derived authoritative records for plugin-host configuration, installed user and project revisions, activation state, marketplace snapshots, portable project declarations, persistent-data references, and transaction generations. Provide storage contracts that validate every read and write, isolate corruption by scope/plugin where possible, and support explicit version migration without turning generated projections into state.

This feature establishes the durable vocabulary consumed by all other lifecycle capabilities. It does not decide trust, store secret values, acquire or promote content, coordinate concurrent writers, execute lifecycle operations, generate runtime projections, or implement Pi reload behavior.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 1 foundation — every other child depends directly or transitively on these records
- Required guarantees: crash, scope, data, and ports guarantees in the parent epic
- Stable seams: authoritative state is the sole input to later replaceable projection generation

## Foundation references

- `docs/SPEC.md` — Scopes; State layout; Project scope; Installed revision record
- `docs/ARCHITECTURE.md` — Authoritative state; Project declaration; State ports; Runtime projections
- `docs/COMPATIBILITY.md` — Whole-plugin behavior; Plugin path environment

## Existing contract references

- `src/domain/schema.ts` — schema/type single-source pattern
- `src/domain/identity.ts` and `src/domain/source.ts` — stable plugin and source identities
- `src/domain/plugin.ts` and `src/domain/compatibility.ts` — normalized bundle/report inputs referenced by installed records

## Late-bound feature decisions

Exact schema version numbers, migration graph, record granularity, corruption-isolation envelope, project-key representation, state snapshot shape, and public store signatures remain for feature design. They must preserve portable project intent, user/project isolation, generated-contract discipline, and fail-fast validation without persisting secrets or runtime adapter state.

## UI alignment

No UI surface. Presentation belongs to `epic-native-plugin-management`.
