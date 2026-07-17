---
id: epic-native-plugin-management-update-policy-offline-startup-notification-ledger
kind: story
stage: implementing
tags: [compatibility, reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-contracts-state]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement Durable Update Notices and Idempotent Publication

## Checkpoint

Replace loose emitted-memory semantics with the existing scope-local registration state's exact notice ledger. Record one ID per scope/plugin/candidate before automatic application; add an idempotent publisher port, list/count/acknowledge/reconcile operations, separate unread from unresolved, and deterministic resolved tombstone pruning. No rendering or Pi UI call belongs here.

## Files

- `src/application/update-notification-service.ts`
- `src/application/ports/update-notification-publisher.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/update-contract.ts`
- focused service/refresh/delivery integration tests

## Acceptance evidence

- Repeated refresh, restart, two writers, publisher retry/lost response, and policy/automatic failure yield one publisher-visible event per retained exact candidate ID.
- Missing/failing publisher retains pending/unread state and never blocks startup, refresh siblings, active revisions, or status/list access.
- Acknowledgment is idempotent and cannot resolve/install; only exact installed/catalog authority produces installed/superseded/removed resolution.
- Unread or unresolved notices never prune; acknowledged resolved records prune by stable time/ID under declared per-plugin/scope limits.
