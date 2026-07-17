---
id: epic-native-plugin-management-lifecycle-sync-operations-project-sync-application
kind: story
stage: done
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

## Implementation notes

- Added project-sync preview/apply over an unforgeable in-process context containing the trusted root, exact project generation/document, file observation, planner evidence, and plan digest. Root/trust/epoch, full project state, and file identity are revalidated before the first effect and before each action.
- Apply performs only the planner's local actions: optional file CAS, exact expected-target lifecycle enable/disable/uninstall, registration removal after dependents, and declaration-digest CAS. Its dependency surface contains no materializer, marketplace add/refresh, install/update, trust/config write, scheduler, adoption, or foreign-file port.
- Added deterministic completed/pending action effects, cancellation between actions, partial-change/recovery evidence, and one-use context admission. File publication precedes machine convergence for publish/merge; the baseline advances only after independent file and machine projection rereads match the desired digest.
- Added a project-state digest commit helper using the existing generation coordinator, scope lock, verified state mutation, and state store rather than a batch journal or second transaction engine.
- Verification: strict typecheck; 10 focused sync-service/planner/codec tests passed.
