---
id: epic-native-plugin-management-packaged-host-composition-reload-recovery-application-container
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-durable-state-configuration, epic-native-plugin-management-packaged-host-composition-installed-revision-loader, epic-native-plugin-management-packaged-host-composition-hook-subagent-composition, epic-native-plugin-management-packaged-host-composition-mcp-composition]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Converge Reload, Recovery, Marketplace Updates, and the Application Container

## Checkpoint

Implement the one complete-plugin `LifecycleReloadPort`, exact old/new Pi reload broker, startup recovery/reconciliation order, scoped journal facade, concrete marketplace plugin probe, and immutable started application container over all existing services.

## Planned files

- `src/composition/complete-plugin-reload.ts`
- `src/pi/pi-reload-broker.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/application/marketplace-plugin-probe.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/lifecycle-transition-reconciler.ts`
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `test/composition/complete-plugin-reload.test.ts`
- `test/pi/pi-reload-broker.test.ts`
- `test/integration/packaged-host-startup-recovery.test.ts`

## Required behavior

- Startup binds project, initializes/open adapters/defaults, constructs services, runs bounded recovery, rereads authority, builds selections/projections, leases artifacts, reconciles all participants, emits resources, then publishes readiness.
- Complete observation always composes exact skill/hook and MCP contribution for one projection; blocked plugins remain explicit and unrelated plugins continue.
- Reload quiesces new hook/MCP admission, installs a candidate selection epoch only for participant-internal callbacks, and resumes external admission only after exact complete evidence. Failure restores the previous complete epoch/set through the same participants or remains recovery-required.
- Manual lifecycle reload is admitted only through an exact current `ExtensionCommandContext` and one session reload gate.
- A safe process-global ticket lets the successor publish exact post-`resources_discover` evidence while the predecessor pins only its admitted application operation. No stale Pi object is used after `ctx.reload()`.
- Fresh-process recovery is conservative; a same-process live predecessor is deferred rather than raced.
- Lifecycle/reconciler settlement always carries explicit scope so journal routing survives restart.
- Marketplace readers/merger, inspection, materializers, compatibility, concrete update probe, refresh/policy/scheduler, lifecycle, recovery, and collection share one adapter graph. Scheduler remains inert until explicitly run.

## Acceptance evidence

- [ ] Exact Pi event-order fixtures prove successful reload/finalization, candidate admission quiescence, previous-epoch restoration, rollback reload, successor failure, mismatched ticket/session/cwd/transition, abort, and serialized concurrent reload.
- [ ] Crash/restart and live-predecessor recovery use the shared reconciler and never replay lifecycle commands.
- [ ] No valid operation context yields explicit reload-unavailable and no activation claim.
- [ ] Marketplace probe always discards staging, performs no trust/activation, and preserves per-plugin failure isolation.
- [ ] Startup performs no network/timer/remote MCP/hook execution and exposes one ready/blocked application container.
- [ ] Reverse disposal closes/release-owned resources while committed/recovery evidence remains durable.

## Ordering constraint

Convergence checkpoint after durable/reconstruction and both runtime participant stories. Package/public hardening is the final dependent.

## Implementation notes

- Added one complete-plugin reload path with candidate selection epochs, admission quiescence, skill/hook → MCP → resource ordering, complete contribution observation, rollback restoration, session lease replacement, and fail-closed observation.
- Added an exact process-local Pi reload broker for one predecessor/successor handoff. Lifecycle settlement now always carries scope, and recovery exposes a restart-safe scoped transition facade plus idempotently closable lease/retention databases.
- Added the construct-only packaged host application root. Explicit startup opens the canonical state/config/content/recovery graph, project/trust/secret authorities, capability/compatibility graph, lifecycle/recovery/collection, concrete marketplace inspection/probe/update services, and both runtime participants; it runs bounded recovery before desired-state reconciliation and starts no scheduler/network refresh.
- Added immutable marketplace update probing that materializes, inspects, assesses, and discards candidates without promotion.
- Verification: composition, Pi, recovery, lifecycle, and packaged startup suites passed (53 focused tests); `npm run typecheck` and `npm run boundaries` passed.
