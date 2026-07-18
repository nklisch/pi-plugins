---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-scheduled-composition-hardening
kind: story
stage: done
tags: [infra, tests]
parent: epic-transactional-plugin-lifecycle-refresh-update-policy
depends_on: [epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery, epic-transactional-plugin-lifecycle-refresh-update-policy-automatic-application-authority]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Schedule, compose, and harden update policy

## Checkpoint

Expose a narrow cancellable scheduled loop and Node composition without starting network work or rendering UI. Prove the complete feature across concurrent session instances, user/project scopes, local/remote sources, immutable comparison, notification memory, and lifecycle automatic outcomes; harden package and dependency boundaries.

## Scope

- Add `UpdateDelayPort` and `MarketplaceUpdateScheduler.run(signal)`; no cron/task registry or process-local authority.
- Perform an immediate scheduled pass only after the caller explicitly starts `run`, then wait until the earliest durable due time with a 15-minute inventory ceiling.
- Add abortable Node delay and a composition factory returning refresh/scheduler services without registering Pi events or starting timers.
- Export only stable schemas/results/factories/ports; keep claim mutation helpers, timer handles, prepared candidates, automatic authorization tokens, paths, native errors, rendering, and direct state writers private.
- Add dependency rules keeping update domain/application code inward-only.
- Add one integrated two-instance test over shared generation state and a fake lifecycle facade; rely on existing source, locking, lifecycle, and recovery suites for their detailed internals.

## Acceptance evidence

- Factory construction causes no network, timers, state writes, recovery, lifecycle update, or notifications.
- Explicit scheduler invocation is cancellable during delay and refresh; abort is never reported as success.
- Two ordinary sessions coalesce or converge durably and return one application-level notification intent per candidate.
- Every remote marketplace is scheduled, explicit bypass works, local is never scheduled/automatic, and sibling work continues after failure.
- User/project source identity and expected-revision races cannot broaden automatic authority.
- Public source/compiled export allowlists and dependency-cruiser rules expose no alternate installer, UI adapter, timer internals, or secret/path-bearing result.
- Full `npm test` passes typechecking, boundaries, focused integration, build, and exact compiled package import.

## Ordering

Final convergence checkpoint after refresh discovery and automatic lifecycle authority. The future Pi adapter may start this scheduler only after local runtime readiness/recovery and may render its typed notification intents.

## Implementation notes

- Added the portable `UpdateDelayPort` and `MarketplaceUpdateScheduler`. `run(signal)` performs no work before explicit invocation, performs an immediate scheduled refresh, then waits for the earliest durable due time bounded by the 15-minute inventory ceiling. Cancellation propagates from both refresh and delay; no abort is converted into success.
- Added the Node composition factory with an abortable `node:timers/promises` delay. Timer ownership remains private to composition; construction creates services only and does not start timers, read state, acquire claims, materialize content, or register host events.
- Published only the stable update-policy, refresh, scheduler, and composition contracts through the explicit package barrel. Claim mutation details, timer adapters, automatic authorization evidence, candidate preparation, and direct state writers remain private. Existing dependency-cruiser inward-layer rules continue to pass.
- Corrected the project v2 constructor to preserve validated `marketplaceUpdates` during generation-coordinated mutations. v1 migration still creates no project update authority, while v2 policy, claim, backoff, and notification memory now survive lifecycle/state rewrites.

## Verification

- `npm run typecheck` passed.
- `npm run boundaries` passed: 176 modules, 1,078 dependencies, no violations.
- Full unit suite passed: 115 files, 627 tests.
- `npm run test:package` passed with the compiled package export allowlist at 434 exports.
