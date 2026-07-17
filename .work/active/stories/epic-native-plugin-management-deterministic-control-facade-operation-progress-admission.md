---
id: epic-native-plugin-management-deterministic-control-facade-operation-progress-admission
kind: story
stage: done
tags: [compatibility, reliability]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry, epic-native-plugin-management-deterministic-control-facade-input-redaction]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement Progress, Cancellation, Polling, and Admission

## Checkpoint

Create commit-aware command execution with structured accepted/progress/result frames, one-frame backpressure, injected execution IDs/timeouts, unified abort propagation, existing-token status/cancel routing, and quiesce/drain semantics.

## Files

- `src/application/ports/native-control-execution.ts`
- `src/application/native-control-progress.ts`
- `src/application/native-control-operation.ts`
- `src/application/native-control-execution.ts`
- focused progress, sink, abort, timeout, polling, concurrency, and disposal tests

## Acceptance evidence

- Each execution has an independent ID and strictly increasing frame sequence; owner progress sequence/phase is validated and never treated as success.
- Slow sinks provide bounded awaited backpressure; EPIPE/throw/close produces no unbounded queue, duplicate result, unhandled rejection, or semantic result rewrite.
- Timeout, caller abort, SIGINT-shaped abort, explicit operation cancel, and host quiescence converge on one signal while committed/partial/rollback/recovery evidence wins.
- Status/cancel validates and routes existing trusted-install/lifecycle tokens without a local session registry or latest-token fallback.
- Quiesce rejects new work; idempotent close drains admitted possibly-committed operations before dependent resources close.

## Implementation notes

- Added versioned accepted/progress/result frames and a per-execution sequencer with owner progress validation, strictly increasing counters, and directly awaited sink writes.
- Sink close/EPIPE/failure stops delivery and aborts the operation signal without throwing from the observer or rewriting a later committed owner result.
- Added exact existing-token parsing/routing for trusted-install and lifecycle status/cancel; no facade session or fallback token lookup exists.
- Added injected ID/timeout execution admission, linked cancellation, isolated concurrent execution state, quiesce rejection, and idempotent active-operation draining.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/native-control-progress.test.ts test/application/native-control-operation.test.ts test/application/native-control-execution.test.ts`
