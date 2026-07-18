---
id: epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Complete Uninstall Cleanup Through Recovery

## Checkpoint

Implement uninstall confirmation/retention and restart-recoverable persistent-data cleanup. Lifecycle first proves exact complete inactive projection and absent installed authority. Journal v2 records `not-required | pending-data-delete | completed | recovery-required`; startup recovery resumes idempotent deletion from verified previous transition evidence.

Configuration and exact trust remain retained/inert. Immutable revisions remain governed by existing runtime leases, grace retention, and collection; no inline revision deletion is added.

## Acceptance evidence

- `keep` never removes persistent data; `delete-confirmed` runs only after exact uninstall commit.
- Crash/lost response at each settle/delete/cleanup-marker point resumes deletion only and never reinstalls/replays uninstall.
- Cleanup failure reports recovery-required with changed-state evidence; unrelated plugins continue.
- V1 journal migration, corrupt evidence, pending transition, rollback, abort, and `removed|already-absent` idempotence are covered.

## Implementation notes

- Added journal v2 cleanup status with deterministic v1 migration. Delete-confirmed uninstall intent is durable from preparation through terminal settlement; rollback/abandonment makes cleanup not required, and pruning cannot discard pending cleanup evidence.
- Added an idempotent uninstall-cleanup service that derives the exact persistent-data reference from the verified previous transition record. It has no configuration, trust, or revision-deletion dependency, so those authorities remain retained/inert and revisions remain collection-owned.
- Added a digest-addressed Node data-removal adapter that verifies scope/plugin/data-ref identity and rejects symlink/replaced roots before deletion.
- Lifecycle results now retain the transition reference internally. Operation projection reports deletion only after the cleanup marker is durable; cleanup failure returns changed-state recovery evidence. Startup recovery retries terminal cleanup independently and continues unrelated plugins.
- Verification: strict typecheck; 22 focused lifecycle/journal/cleanup/recovery tests passed.
