---
id: epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator
kind: story
stage: implementing
tags: [reliability, infra]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-scheduler-ownership-clock, epic-native-plugin-management-update-policy-offline-startup-automatic-eligibility-application]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
