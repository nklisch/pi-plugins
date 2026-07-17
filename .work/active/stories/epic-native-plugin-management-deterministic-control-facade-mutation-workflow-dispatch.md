---
id: epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch
kind: story
stage: implementing
tags: [compatibility, reliability]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-input-redaction, epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch, epic-native-plugin-management-deterministic-control-facade-operation-progress-admission]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Dispatch Native Mutation Workflows

## Checkpoint

Implement exhaustive request assembly for marketplace mutations/adoption, staged and atomic trusted install, lifecycle/update/uninstall, project sync, update policy, notices, and automatic updates using only existing application services.

## Files

- `src/application/ports/native-control-applications.ts`
- `src/application/native-control-mutation-dispatch.ts`
- `src/application/native-control-install.ts`
- `src/application/native-control-lifecycle.ts`
- `src/application/native-control-update-policy.ts`
- focused workflow, no-bypass, concurrency, cancellation, and result-mapping tests

## Acceptance evidence

- Each mutation invokes its intended owner service path once; spies prove no direct state/store/materializer/trust/configuration/recovery/runtime access.
- Parse, readiness, selection, input, and confirmation failure performs zero mutation.
- One-shot install is exact inspect/open/input/activate composition and matches staged behavior without second materialization or an alternate executor.
- Lifecycle/sync/policy paths preserve exact previews, versions, authority, consent, conflict resolutions, retention intent, progress, effects, rollback, and recovery.
- Concurrent operations rely on owner sessions/schedulers/locks/CAS/journals/reload admission; no facade lock, hidden retry, transaction, or success inference appears.
