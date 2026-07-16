---
id: centralize-host-config-v2-compatibility-projection
kind: feature
stage: drafting
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Centralize the Host-Config v2 Compatibility Projection

## Brief

The host-config v1→v2 compatibility shape is hand-copied across strict migration, tolerant decoding, verified mutation construction, and commit-evidence comparison:

- `src/domain/state/config-state.ts:53-65` owns the registered strict migration.
- `src/domain/state/codec.ts:269-284` independently adds the same refresh and notification defaults while preserving record-level quarantine.
- `src/application/state-contract.ts:275-279` independently projects v1 mutation input to v2.
- `src/application/generation-mutation-coordinator.ts:333-343` independently rebuilds that projection when comparing v1 adapter evidence with a v2 mutation.

Extract one host-config compatibility projection owned by the state domain and reuse it at these four boundaries. Preserve each caller's existing validation and corruption-isolation behavior: the shared operation should own only the deterministic shape change (`schemaVersion`, refresh defaults, and notification defaults), not collapse strict parsing and tolerant record decoding into one path.

## Value

**Priority:** High  
**Risk:** Medium  
**Source lens:** missing abstraction / single source of truth

This removes four copies of migration policy from security-sensitive state paths and makes future host-config version changes update one projection rather than codec, mutation, and commit-proof logic separately.

## Constraints

- Preserve byte-for-byte equivalent v2 values for every currently accepted v1 host-config document.
- Preserve record-granular quarantine in `decodeStateDocument`; malformed siblings must not become document-fatal.
- Preserve strict mutation verification and v1 adapter-envelope compatibility.
- Do not alter installed-user or project-local migration behavior in this refactor; their compatibility paths have different shape and validation concerns.
- Do not change schemas, public exports, update defaults, or corruption guarantees.

## Verification focus

Use the existing host-config migration, codec corruption-isolation, state-mutation, and generation-coordinator compatibility tests. Add only a focused equivalence test if the shared projection is not already exercised through all four boundaries.
