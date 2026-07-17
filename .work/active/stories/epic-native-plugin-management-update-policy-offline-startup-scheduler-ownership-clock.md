---
id: epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock
kind: story
stage: done
tags: [reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-policy-facade, epic-native-plugin-management-update-policy-offline-startup-notification-ledger]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Harden the Existing Scheduler for Ownership, Restart, and Clock Changes

## Checkpoint

Extend the existing marketplace update scheduler rather than adding another loop. Add per-scope durable ownership leases, lease-bound scheduled refresh admission, cadence-registry timing, hash-derived persisted jitter, bounded success/failure backoff, restart due selection, monotonic waits with wall-clock rereads, clock-regression status, and clean abort/release behavior.

## Files

- `src/application/marketplace-update-scheduler.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/update-schedule.ts`
- `src/application/ports/update-delay.ts`
- `src/application/ports/update-scheduler-lease-id.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/composition/create-marketplace-update-services.ts`
- focused schedule/scheduler/multiprocess tests

## Acceptance evidence

- Construction is timer/I/O inert; only `run(signal)` waits or refreshes, and abort settles every wait/claim/lease path.
- Restart honors persisted future due/backoff and does not force a refresh; first-use due runs only after explicit scheduler start.
- Two processes have one user owner and one owner per current project scope; a project-A owner cannot suppress project-B work.
- Lease/claim expiry, ownership loss, deterministic jitter, forward/backward clocks, explicit bypass, local-source exclusion, incomplete inventory, and remote failure preserve selected catalogs and active revisions.

## Implementation notes

- Extended the existing scheduler with CAS-backed user/project scope leases, per-process lease IDs, renewal/release, exact validation, and lease-fenced scheduled refresh admission. Explicit refresh remains lease-free but still uses refresh claims.
- Added one cadence registry and SHA-256-derived deterministic jitter. Refresh persists the complete anchor/base/jitter/due tuple, so restart and competing processes never recompute an existing due time.
- Scheduler waits remain abortable/monotonic while every wake rereads wall time and durable inventory. Forward jumps run due work; backward jumps pause with clock-regressed status.
- Future-clock or expired leases/claims are stale, ownership loss prevents new scheduled claims, and shutdown releases owned leases best-effort.

## Verification

- `npx vitest run test/application/update-schedule.test.ts test/application/marketplace-update-scheduler.test.ts test/application/marketplace-update-scheduler-ownership.test.ts test/application/marketplace-refresh-service.test.ts test/integration/marketplace-scheduler-multiprocess.test.ts test/integration/marketplace-update-policy.test.ts` — 21 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
