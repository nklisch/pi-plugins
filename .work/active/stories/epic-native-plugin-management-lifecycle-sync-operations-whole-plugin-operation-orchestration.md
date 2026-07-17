---
id: epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration
kind: story
stage: done
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

## Implementation notes

- Added one verified-context lifecycle executor for enable, disable, update, and uninstall. Enable/disable/uninstall call the existing lifecycle service with exact target expectations; manual update transfers the inspected candidate lease to the generalized prepared update authority.
- Manual update uses the trusted-install submission validator, configuration save/exact-reread authority, project-root authority, and exact trust grant. Target/candidate/evidence/project/configuration are reread after preflight and before lifecycle.
- Added bounded monotonic progress recording whose observer failures produce only `PROGRESS_DELIVERY_FAILED` safe evidence and never affect the operation.
- Added lossless safe lifecycle projection for changed/current/stale/conflict/rollback/recovery/cancel/reject outcomes. Raw snapshots, causes, callback text, roots, and values are structurally absent.
- Verification: strict typecheck; 15 focused lifecycle-operation/update/lifecycle tests passed.
