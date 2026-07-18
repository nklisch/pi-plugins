---
id: epic-native-plugin-management-production-runtime-acceptance-failure-recovery-drift
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-native-plugin-management-production-runtime-acceptance
depends_on: [epic-native-plugin-management-production-runtime-acceptance-full-bundle-harness]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Prove production failure, recovery, and drift closure

## Checkpoint

Implement Unit 4 from the parent feature in `test/e2e/production/failure-recovery-drift.e2e.test.ts`. Attack the real packed runtimes and lifecycle without product test hooks. Preserve one exact prior bundle or explicit recovery-required evidence; never accept partial activation.

## Required matrix

- Reject a bad V2 before commit and prove complete V1 remains.
- Kill a pending V1→V2 update before successor proof; restart to one exact V1 or V2 with no mixed contribution.
- After confirmed candidate authority, kill and corrupt only candidate projection/content evidence; restart must deterministically roll back to complete V1.
- Run one good and one failing MCP server path. Failed launch is redacted per-server health; good source/server remains registered and usable.
- Cancel MCP launch/call and interrupt source cleanup. Late values and leases must drain; no false inactive/uninstalled success is allowed.
- Mutate disposable installed MCP and subagent package version, receipt-covered bytes, and documented API separately before startup. The affected capability becomes unavailable before dependent activation; an ordinary-only sibling remains usable.
- Restore the exact registry-installed consumer snapshot and prove qualification returns without domain/state/facade migration or fork branch.

## Fault rules

- Journal/state/file observations may only place deterministic SIGKILL/corruption boundaries. Final truth comes from a fresh `/plugin` status/list/show/diagnose, skill discovery, hook records, subagent result, MCP listing/call, process cleanup, and SQLite integrity.
- Drift sentinel code must not execute. Receipt/API/native details stay behind static safe capability diagnostics.
- Remote/process health cannot become source-registration failure; source mutation/cleanup ambiguity cannot be downgraded to health.

## Acceptance evidence

- [ ] Every fault preserves a complete prior revision or explicit recoverable ambiguity.
- [ ] Candidate corruption yields verified V1 rollback across skill, ordinary hooks, subagent hooks, and MCP with no V2 active residue.
- [ ] MCP failure/cancellation isolates servers/plugins/scopes and releases values/processes/leases exactly.
- [ ] Version, installed-tree, and API drift fail closed before activation and isolate only their capability.
- [ ] Exact-byte restoration proves package selection is replaceable behind unchanged host ports/facade.
- [ ] Output/state/logs/artifacts contain no canary, package policy, fork identity, path, or native cause.

## Ordering and risk

Depends on the production harness and can proceed as the same feature-owner layer as golden lifecycle. Crash timing is the main risk: bounded external phase conditions place faults; deterministic rollback additionally removes candidate evidence only after pending candidate authority is confirmed.
