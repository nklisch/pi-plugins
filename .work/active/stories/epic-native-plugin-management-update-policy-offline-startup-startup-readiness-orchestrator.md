---
id: epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator
kind: story
stage: done
tags: [reliability, infra]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock, epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Orchestrate Offline Startup and Truthful Readiness

## Checkpoint

Name and enforce packaged startup order: local adapter open, durable recovery, settled-authority reread, local runtime reconciliation, immutable initial `ready | degraded | blocked` publication, then policy-gated background coordinator start. Add a derived host status service that can report later update-subsystem degradation without making remote health startup authority.

## Files

- `src/application/host-observation-contract.ts`
- `src/composition/packaged-host-startup.ts`
- `src/composition/host-status-service.ts`
- `src/composition/background-update-coordinator.ts`
- `src/composition/complete-plugin-reload.ts`
- focused startup/status/background tests

## Acceptance evidence

- Factory construction is filesystem/network/process/timer/recovery inert; explicit start performs no remote work before local status publication.
- Recovery always precedes runtime reconciliation; notice reconciliation/scheduler ownership always follow both.
- Offline/hung/failing marketplace, Git/npm/HTTP, publisher, remote MCP, and update adapters cannot delay initial local readiness or disable working siblings.
- Host-global failure versus affected-plugin/background failure maps correctly to blocked/degraded/ready, including a clean host with absent optional forks.
- Start/close/restart/partial-start failure leaves no task, timer, lease, publisher, or false readiness.

## Implementation notes

- Added an explicit local-only startup orchestrator that enforces open → recovery → local reconciliation → immutable status publication → background start. Construction performs no work.
- Added derived host status with truthful ready/degraded/blocked local semantics and independently mutable update subsystem/count health. Optional unavailable MCP/subagent/secret capabilities do not degrade an unaffected clean host.
- Added a background coordinator that owns the existing scheduler task, starts only for enabled inventory after readiness, performs no second timing loop, and catches remote/notification/automatic failures into degraded status.
- Packaged startup now exposes status, starts no timer for an empty/paused inventory, and aborts/drains background scheduling before runtime/application resource closure.

## Verification

- `npx vitest run test/composition/packaged-host-startup.test.ts test/composition/host-status-service.test.ts test/composition/background-update-coordinator.test.ts test/integration/packaged-host-startup-recovery.test.ts test/integration/packaged-host-crash-recovery.test.ts test/integration/packaged-host-process-startup.test.ts` — 9 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
