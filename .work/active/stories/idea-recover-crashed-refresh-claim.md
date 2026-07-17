---
id: idea-recover-crashed-refresh-claim
kind: story
stage: implementing
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [idea-packed-refresh-cancellation-state-stale]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Recover crashed marketplace refresh claims

## Original finding

Killing the packed Pi process while a marketplace refresh owns a durable claim leaves that dead-owner claim active across restart. The old V1 catalog is preserved correctly, but one explicit retry returns only a `coalesced` outcome with the dead claim's future expiry and cannot select the already published V2 revision.

Reproducer: `test/e2e/chaos/lifecycle-crash-recovery.e2e.test.ts` pauses the separate real Git backend at an externally recorded acquisition boundary, SIGKILLs the complete Pi process group, restarts from the same clean agent directory, verifies V1 remains exact, and retries once. The linked expected failure requires dead-process reconciliation before the retry and exactly one selected V2 snapshot.

## Fix contract

- Distinguish a live refresh owner from a claim abandoned by a crashed host without relying on wall-clock lease expiry.
- Reconcile only proven-dead ownership through the existing scope-lock/process-owner authority; unknown/live owners still coalesce.
- Preserve V1 until one explicit retry selects exactly V2 and clears the recovered claim.
- Prove the behavior with a killed packed Pi process and real Git acquisition boundary.
