---
id: epic-native-plugin-management-lifecycle-sync-operations-session-facade-admission-disposal
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration, epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery, epic-native-plugin-management-lifecycle-sync-operations-project-sync-application]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose Transient Operation Sessions and Facade

## Checkpoint

Implement `NativeLifecycleOperationService.preview/apply/run/status/cancel` and bounded host-epoch session storage. Apply compare-and-sets one versioned session owner, validates exact confirmation, revalidates all authority, invokes one internal operation, and retains only safe bounded progress/result evidence.

Quiesce rejects new work but preserves an already admitted reload. Close occurs after packaged operation drain and releases every untransferred candidate lease and file observation.

## Acceptance evidence

- Preview/apply and explicit-provider run are equivalent and have no hidden approval/fast path.
- Wrong/stale token/version/preview/operation/consent/resolution fails before mutation; concurrent apply has one owner.
- Update leases transfer once or release on every edge; host/project/file changes invalidate sync observations.
- Idle/absolute/terminal reaping requires no timer and retains no sensitive submission/native callback error.
- Quiesce/close/repeated close/reload successor/expiry/disposal preserve admitted operation evidence and cleanup order.
