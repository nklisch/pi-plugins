---
id: idea-recover-crashed-refresh-claim
created: 2026-07-17
updated: 2026-07-17
tags: [compatibility]
---

Killing the packed Pi process while a marketplace refresh owns a durable claim leaves that dead-owner claim active across restart. The old V1 catalog is preserved correctly, but one explicit retry returns only a `coalesced` outcome with the dead claim's future expiry and cannot select the already published V2 revision.

Reproducer: `test/e2e/chaos/lifecycle-crash-recovery.e2e.test.ts` pauses the separate real Git backend at an externally recorded acquisition boundary, SIGKILLs the complete Pi process group, restarts from the same clean agent directory, verifies V1 remains exact, and retries once. The linked expected failure requires dead-process reconciliation before the retry and exactly one selected V2 snapshot.
