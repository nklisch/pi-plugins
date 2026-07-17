---
id: epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition
kind: story
stage: done
tags: [compatibility, reliability, infra]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock, epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application, epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator, epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Compose the Native Update Facade and Shared Host Lifetime

## Checkpoint

Expose one `NativeUpdateManagementService` for policy preview/apply/status, notice list/ack, and pending automatic application. Compose it with existing discovery/refresh/scheduler/lifecycle/inspection authorities, remove the low-level packaged policy setter, share foreground/background operation admission and Pi reload context, and implement commit-aware clean shutdown ordering. Keep command/TUI rendering and Pi notification calls out.

## Files

- `src/application/native-update-management-service.ts`
- `src/composition/create-native-update-management-service.ts`
- `src/composition/create-marketplace-discovery-services.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/pi/pi-operation-context.ts`
- `src/index.ts`
- `src/pi/index.ts`
- focused facade/composition/shutdown/public-boundary tests

## Acceptance evidence

- Packaged callers obtain every update policy/status/count/ack/automatic action through `application.updates` with no raw setter, scheduler, automatic origin, state helper, lease, publisher, or timer handle.
- Background and manual operations share operation admission, lifecycle concurrency, reload context, and quiescence semantics.
- Shutdown aborts/drains waits, refresh, publication, automatic attempts, operation sessions, reload handoff, runtimes, and stores in safe order exactly once.
- Construction remains inert; public/packed allowlists are explicit and schema-derived; no command/TUI/Pi notification renderer is introduced.

## Implementation notes

- Added one `NativeUpdateManagementService` for policy preview/apply/status, durable notice list/count/ack, and automatic pending application; callers do not join lower-level services.
- Added a composition root that reuses authoritative state/CAS, the existing scheduler/refresh services, notification ledger, policy authority, and a narrow adapter into the existing lifecycle transaction.
- Packaged `application.updates` is admitted through the same Pi operation/lifetime gate as lifecycle operations. The low-level packaged marketplace policy setter is no longer exposed.
- Exact automatic application resolves the retained catalog candidate, derives an exact current lifecycle target expectation, rechecks candidate configuration/capabilities/project trust, and invokes `PluginLifecycleService.update` with automatic origin. It never writes lifecycle or recovery state directly.
- Background scheduling/notification/automatic work shares shutdown cancellation and drains before runtime/stores. Direct calls after quiescence or outside operation context are rejected.

## Verification

- `npx vitest run test/application/native-update-management-service.test.ts test/composition/packaged-plugin-host-contract.test.ts test/integration/packaged-host-disposal.test.ts test/integration/packaged-host-startup-recovery.test.ts test/composition/background-update-coordinator.test.ts` — 10 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
