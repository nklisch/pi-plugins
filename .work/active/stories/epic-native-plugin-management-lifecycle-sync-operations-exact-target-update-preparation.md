---
id: epic-native-plugin-management-lifecycle-sync-operations-exact-target-update-preparation
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Bind Exact Targets and Prepared Update Candidates

## Checkpoint

Implement exact installed-target resolution from native inspection and generalize trusted-install candidate/prepared lifecycle seams for update. `LifecycleTargetExpectation` binds generation, target digest, revision, activation, and no pending transition. `PreparedLifecycleCandidate` retains one exact catalog resolution/materialization, compatibility/config/trust/executable/capability binding, safe disclosure, and lease.

Extend the package-private prepared lifecycle authority with `updatePrepared`; public install/lifecycle APIs remain source compatible through optional expectations and trusted-install aliases. Both prepared paths enter the existing lifecycle executor.

## Acceptance evidence

- Changed scope/generation/revision/activation/pending/project/capability/target evidence is stale or conflict; unrelated generation rebases only when target bytes remain exact.
- Update proves exact registration/candidate/catalog snapshot/plugin/source/revision/update-key binding with one materialization and no latest/name fallback.
- Prepared update performs no second acquisition and uses the existing promotion, journal, CAS, reload, observation, compensation, and recovery implementation.
- Existing trusted installation and lifecycle tests remain behavior/source compatible.
