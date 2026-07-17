---
id: epic-native-plugin-management-lifecycle-sync-operations-project-sync-application
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration, epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery, epic-native-plugin-management-lifecycle-sync-operations-project-sync-diff-merge-planner]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Apply Project Sync with Exact Retry Evidence

## Checkpoint

Implement project-sync preview/apply over exact project root/trust/epoch, state generation, file observation, and plan/resolution evidence. Known required actions/unresolved conflicts produce zero mutation. Publish/merge writes approved intent first; existing lifecycle operations then converge project activation/removal; final reread commits only `declarationDigest` through existing verified state mutation/CAS.

No batch transaction or reverse replay is added. Each plugin action owns compensation/recovery; partial exact effects keep the old declaration digest and are safe to re-preview/retry.

## Acceptance evidence

- Network/materializer/add/refresh/install/update/trust/config/foreign-state spies remain unused by sync.
- Pre-effect file/project/plan change returns stale/conflict with zero effects.
- Enable/disable/uninstall use exact complete lifecycle paths; direct record edits never impersonate activation.
- Crash/cancel after file write or any action reports exact effects and retries idempotently.
- Digest advances only after file, registrations, constraints, installed set, and activation intent independently converge.
