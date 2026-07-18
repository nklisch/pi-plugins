---
id: idea-recover-crashed-refresh-claim
kind: story
stage: done
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [idea-packed-refresh-cancellation-state-stale]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Resolution

Refresh claims now carry process-owner evidence (PID plus Linux process start token). Restart reclaims a claim immediately only when that exact owner is proven dead; live or unknown owners still coalesce until normal expiry. The existing scope lock and state mutation authorities remain the only commit path.

Verified by focused process-owner/refresh regressions, the killed packed-Pi acquisition scenario with one exact V2 retry, the complete 43-test E2E lane, and consolidated unit/package acceptance.
