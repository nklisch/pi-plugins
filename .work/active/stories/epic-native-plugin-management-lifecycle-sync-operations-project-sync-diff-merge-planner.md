---
id: epic-native-plugin-management-lifecycle-sync-operations-project-sync-diff-merge-planner
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers, epic-native-plugin-management-lifecycle-sync-operations-project-intent-file-authority]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Plan Deterministic Project Sync and Merge

## Checkpoint

Implement pure project-machine projection and `apply-intent | publish-intent | merge` planning. Merge is deterministic union; same-key source/enabled/constraint differences require explicit `file | machine | omit` resolution. The planner derives canonical machine/file/desired/plan/action/conflict digests and stable unsigned-UTF-8 order.

Sync never plans network, marketplace add/refresh, install/update, trust grant, configuration save, or foreign-state access. Missing registrations/plugins, constraint mismatch, missing trust/configuration, and pending recovery become required actions that block apply.

## Acceptance evidence

- Input permutations produce byte-identical projection, plan, action, required-action, and conflict output.
- User/project collisions remain project-qualified; user state never satisfies or changes project intent.
- Directional deletion, merge union/resolution, missing file, unsynchronized sentinel, constraints, enablement, and adopted-origin preservation match the parent design.
- Every resolved desired value passes the strict portable schema and contains no machine/trust/config/runtime evidence.
