---
id: epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-exact-target-update-preparation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Orchestrate Whole-Plugin Lifecycle Operations

## Checkpoint

Implement exact enable, disable, and manual update orchestration plus safe lifecycle-result/progress projection. Enable/disable invoke existing lifecycle with target expectations. Update reuses trusted-install input partition, configuration custody, exact trust grant, authority reread, candidate lease transfer, and prepared lifecycle update.

No application result exposes raw lifecycle snapshots or native failures. Success requires exact complete runtime observation; cancellation after a possible commit yields rollback/recovery truth.

## Acceptance evidence

- Exact already-enabled/disabled/current-revision states return `current-state` without writes/reload.
- Update validates all inputs before mutation, keeps `SensitiveValue` callback-scoped, and reports retained inert configuration/trust preflight.
- Project trust/root, target, candidate, configuration, consent, and capability are revalidated at every effectful boundary.
- Changed/unchanged/rejected/stale/rolled-back/recovery-required lifecycle outcomes map losslessly and safely.
- Progress callback failure never changes/cancels the operation or leaks callback text.
