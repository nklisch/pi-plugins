---
id: gate-tests-operation-cancel-outcomes
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: tests
created: 2026-07-18
updated: 2026-07-18
---

# Verify public operation cancellation outcomes

## Priority
Medium

## Value evidence
Item: `epic-native-plugin-management-deterministic-control-facade`. `operation cancel` has production dispatch but only grammar coverage; accepted, missing, and post-commit owner truth are unproven.

## Acceptance
- A packed Pi RPC process opens and starts a real lifecycle operation which is deterministically stalled before durable commit; its public `operation cancel` command returns exactly accepted and the operation settles cancelled.
- A second packed process sends cancellation for the same live process-owned token and returns exactly missing/not-found; a fresh process proves installed authority remained unchanged after accepted cancellation.
- Cancellation after durable success and after owner loss returns exactly missing/not-found and cannot replace committed or rolled-back recovery truth.
- Assertions use packed public envelopes and durable inspection only; no direct session registry, synthetic operation owner, or grammar-only test substitutes for the boundary.

## Test location
`test/e2e/failure/output-cancellation-reload.e2e.test.ts`

## Implementation evidence
Used the real SQLite scope-lock process to stall a packed trusted-install operation at its public `trust-decision started` progress frame before commit. The owning packed RPC accepts cancellation, a peer reports the real token missing, the apply settles cancelled, and both a stable public-state digest and fresh packed process prove authority unchanged. A second real apply commits, then its reload successor reports the old token missing while durable installation remains present. A crash after durable pending authority separately proves post-owner cancellation cannot overwrite the fresh process's exact rolled-back recovery outcome.

Focused regression: `npx vitest run --config vitest.e2e.config.ts test/e2e/failure/output-cancellation-reload.e2e.test.ts` — 5 passed.

## Bounded inline review
Confirmed the owner is a real packed operation, the stall is an OS/SQLite boundary rather than a synthetic service, and all result assertions use public control envelopes plus fresh durable inspection. Statuses and owner states are exact; no grammar-only fallback or mock call is accepted. No material findings.
