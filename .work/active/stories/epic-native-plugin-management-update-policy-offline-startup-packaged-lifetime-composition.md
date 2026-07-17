---
id: epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition
kind: story
stage: implementing
tags: [compatibility, reliability, infra]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock, epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application, epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator, epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
