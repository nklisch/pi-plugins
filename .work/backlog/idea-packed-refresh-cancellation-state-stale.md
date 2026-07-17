---
id: idea-packed-refresh-cancellation-state-stale
created: 2026-07-17
updated: 2026-07-17
tags: [compatibility]
---

Cancelling a packed manual marketplace refresh while the real HTTPS Git backend is externally paused returns a partial `STATE_STALE` outcome rather than the refresh owner's cancelled/aborted evidence. The prior catalog remains selected, but the public result does not explain cancellation and violates the designed cancellation precedence.

Reproducer: `test/e2e/failure/output-cancellation-reload.e2e.test.ts` pauses the separate real `git http-backend` at its externally recorded backend boundary, sends public RPC abort, resumes the process group, and asserts the exact prior catalog remains. The linked expected failure requires explicit cancelled/aborted owner evidence rather than accepting `STATE_STALE` or a generic error.
