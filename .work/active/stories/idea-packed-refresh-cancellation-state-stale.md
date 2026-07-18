---
id: idea-packed-refresh-cancellation-state-stale
kind: story
stage: done
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Preserve refresh cancellation owner truth

## Original finding

Cancelling a packed manual marketplace refresh while the real HTTPS Git backend is externally paused returns a partial `STATE_STALE` outcome rather than the refresh owner's cancelled/aborted evidence. The prior catalog remains selected, but the public result does not explain cancellation and violates the designed cancellation precedence.

Reproducer: `test/e2e/failure/output-cancellation-reload.e2e.test.ts` pauses the separate real `git http-backend` at its externally recorded backend boundary, sends public RPC abort, resumes the process group, and asserts the exact prior catalog remains. The linked expected failure requires explicit cancelled/aborted owner evidence rather than accepting `STATE_STALE` or a generic error.

## Fix contract

- Settle an owned pre-publication abort with explicit cancelled/ABORTED evidence using a fresh cleanup signal.
- Preserve the previously selected catalog and clear only the caller's exact claim.
- Do not reinterpret post-commit cancellation as cancellation or broad-accept stale outcomes.
- Prove packed public cancellation and restart truth under a paused real Git backend.

## Resolution

Refresh completion now rebases boundedly over unrelated generation changes while preserving exact claim/source ownership fences. Pre-publication owner cancellation settles with explicit aborted evidence and a fresh cleanup signal; post-commit cancellation continues to report durable truth. Scheduler writes no longer churn generations for unchanged ownership state.

Verified by focused refresh/scheduler tests, the paused real-Git cancellation and restart journey, the complete 43-test E2E lane, and consolidated package acceptance.
