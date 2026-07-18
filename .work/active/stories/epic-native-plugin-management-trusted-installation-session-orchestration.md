---
id: epic-native-plugin-management-trusted-installation-session-orchestration
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-configuration-custody, epic-native-plugin-management-trusted-installation-exact-trust-grants, epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Orchestrate resumable trusted-install sessions

## Checkpoint

Implement the bounded in-memory state machine behind `open`, `activate`, `run`, `status`, and `cancel`: complete mutation-free missing-input discovery, exact configuration/trust preflight, final authority revalidation, lease transfer, lifecycle result mapping, progress, expiry, retry, and cancellation.

## Files

- `src/application/trusted-install-session.ts`
- `src/application/trusted-install-service.ts`
- `test/application/trusted-install-session.test.ts`
- `test/application/trusted-install-service.test.ts`

## Acceptance evidence

- Staged and one-shot paths execute the same engine and equivalent evidence yields equivalent progress/results.
- Session 15-minute idle/60-minute absolute/5-minute terminal retention, host epoch, token checksum, and version CAS are deterministic.
- Sessions never retain submissions, sensitive/configured values, locators, project roots, resolved facades, or native errors.
- Missing input is complete and mutation-free; retained exact configuration/trust makes safe retries explicit.
- Double activation, callback failure, expiry, cancellation at every boundary, stale authority, rollback, and recovery preserve honest final state.

## Implementation notes

- Added the host-epoch in-memory session registry with 15-minute idle, 60-minute absolute, and 5-minute terminal retention; deterministic service-entry reaping; version CAS; host-checksummed token lookup; and idempotent close/release.
- Implemented `open`, `activate`, `run`, `status`, and `cancel` over one state machine. Missing deterministic input is complete and mutation-free; provider failure/cancellation settles before mutation.
- Activation revalidates the exact catalog candidate and captured project/capability evidence before consent and the first durable effect, then performs existing configuration custody, exact trust mutation, exact configuration reread, project/root revalidation, and lifecycle lease transfer in order.
- Sessions retain only the candidate lease, safe binding/views/progress, revision booleans/digests, controller, and terminal result. Submissions, `SensitiveValue`, configured values, locators, roots, resolved facades, callback/native errors, and causes are never stored.
- Concurrent same-token activation returns operation-in-progress; terminal replay returns the already-proven result without another mutation. Cancellation before lifecycle releases bytes, while lifecycle rollback/recovery/current-state evidence controls results after transfer.
- Progress is bounded and monotonic; observer failure records only `PROGRESS_DELIVERY_FAILED` and cannot alter operation authority or success.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/trusted-install-session.test.ts test/application/trusted-install-service.test.ts` — 7 passed.
