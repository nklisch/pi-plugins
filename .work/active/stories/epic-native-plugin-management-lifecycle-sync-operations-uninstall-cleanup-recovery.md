---
id: epic-native-plugin-management-lifecycle-sync-operations-uninstall-cleanup-recovery
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-whole-plugin-operation-orchestration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
