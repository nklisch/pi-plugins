---
id: epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application
kind: story
stage: done
tags: [compatibility, reliability, security]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-policy-facade, epic-native-plugin-management-update-policy-offline-startup-notification-ledger]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Authorize and Apply Exact Automatic Updates Through Lifecycle

## Checkpoint

Implement registry-owned automatic eligibility and one coordinator over durable notices. Require exact effective consent, stable source identities, target/candidate/revision, project trust/root, capability, baseline trust, current configuration and secret custody, recovery safety, and reload-capable operation admission. Eligible work invokes the existing lifecycle automatic-update path with expected revision and target; every other outcome updates the same notice truthfully.

## Files

- `src/application/automatic-update-eligibility.ts`
- `src/application/automatic-update-coordinator.ts`
- `src/application/automatic-update-authorization.ts`
- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/native-lifecycle-target.ts`
- `src/application/ports/update-activation-context.ts`
- focused eligibility/coordinator/lifecycle integration tests

## Acceptance evidence

- Forged notice/origin/policy cannot bypass lifecycle's current authority rereads, trust/configuration, preparation, journal, reload observation, rollback, or recovery.
- Moved ref/catalog, changed source, stale target/project/capability, missing secret/fork runtime, pending transition, and recovery produce typed non-destructive outcomes.
- Concurrent manual/automatic same or different candidates converge through the existing scheduler/lock/CAS and exact target expectations.
- No live reload context makes zero lifecycle calls and retains `automatic-pending`; a later admitted application-context call applies without another consent.
- Cancellation, ambiguous commit, rollback, and restart recovery preserve the prior active revision and commit-aware status.

## Implementation notes

- Added one ordered eligibility registry covering current notice/candidate, hierarchical policy/source guard, exact target, project trust/root, recovery, configuration, secret custody, runtime capability, and live reload context.
- Added a narrow `AutomaticUpdateLifecyclePort` over the existing lifecycle authority. It admits only exact durable notices and owns no state, projection, journal, installer, or recovery mutation path.
- The coordinator persists pending/blocked/retry/recovery/application evidence on the same notice and calls lifecycle only after every gate and a live operation context. Applied/current outcomes resolve the exact notice without acknowledging it.
- Lifecycle automatic authorization now rereads hierarchical policy and source guards while retaining baseline exact trust, configuration, project trust, preparation, promotion, reload, rollback, and recovery authority.
- No startup reconciler or stale Pi context is used for live updates; absent operation context makes zero lifecycle calls and remains pending for a later admitted facade call.

## Verification

- `npx vitest run test/application/automatic-update-coordinator.test.ts test/application/automatic-update-authorization.test.ts test/application/plugin-lifecycle-service.test.ts test/integration/plugin-lifecycle.test.ts` — 27 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
