---
id: epic-native-plugin-management-update-policy-offline-startup-contracts-state
kind: story
stage: implementing
tags: [compatibility, reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Define Update Policy, Schedule, Notice, and State Contracts

## Checkpoint

Evolve the existing update-policy registry and host-config/project-local state families to v4. Add schema-derived global/scope/marketplace/plugin policy targets and precedence inputs, cadence presets, persisted schedule and scope-lease evidence, exact notice/candidate/automatic-attempt memory, and domain-separated IDs. Migrate v1–v3 without dropping registration origin, source, refresh claims/backoff, snapshots, or current notification evidence.

## Files

- `src/domain/update-policy.ts`
- `src/domain/state/config-state.ts`
- `src/domain/state/project-state.ts`
- `src/domain/state/codec.ts`
- `src/domain/state/registry.ts`
- `src/application/native-update-contract.ts`
- `src/application/native-update-identifiers.ts`
- `src/application/marketplace-update-state.ts`
- `src/infrastructure/state/lifecycle-state-defaults.ts`
- matching domain/application tests

## Acceptance evidence

- Strict schemas reject unknown/impossible policy, lease, schedule, notice, acknowledgment, resolution, source-binding, and automatic-attempt states plus forbidden path/secret/native-cause values.
- Pure fixtures prove plugin → marketplace → scope → global precedence and hard manual guards for local, changed, and legacy source identity.
- v1–v4 migration and fresh generation-zero encoding are deterministic; old automatic remains an exact marketplace override and old manual inherits the global-manual default.
- Every state writer preserves unrelated v4 policy/lease/notice fields, and identifiers bind exact semantic evidence independent of array order.
