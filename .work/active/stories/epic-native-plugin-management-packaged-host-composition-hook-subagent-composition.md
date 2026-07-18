---
id: epic-native-plugin-management-packaged-host-composition-hook-subagent-composition
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-packaged-host-composition
depends_on: [epic-native-plugin-management-packaged-host-composition-runtime-selection-capabilities]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Compose Skills, Ordinary Hooks, and Optional Subagent Hooks

## Checkpoint

Wire the existing skill/hook snapshot, resource, planner, execution, Pi adaptation, and subagent factories into one session-owned runtime. Add exact parent-session evidence and session-lifetime revision leasing without changing hook semantics.

## Planned files

- `src/composition/create-skill-hook-runtime.ts`
- `src/pi/pi-subagent-session-context.ts`
- `src/pi/plugin-host-runtime-delegates.ts`
- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `test/composition/create-skill-hook-runtime.test.ts`
- `test/pi/plugin-host-runtime-delegates.test.ts`
- `test/integration/packaged-hook-subagent-runtime.test.ts`

## Required behavior

- Reuse `createSkillHookSnapshotLoader`, `createSkillHookRuntimeParticipant`, `createSkillResourceDiscoveryRuntime`, manifest path verification, planner, context, guarded executor, Pi decisions, and continuation guard.
- Bootstrap delegates exist inertly; startup installs one target before the same `session_start` hook boundary and Pi resource discovery.
- Exact session/cwd/current-project evidence reaches every hook plan/execution.
- One session lease pins all active skill/hook plugin and projection artifacts and is replaced only after a complete next set exists.
- A qualified published subagent port registers exactly one aggregate coordinator for the exact parent session and matching qualification digest.
- No qualified subagent port means no registration and an unavailable capability; ordinary hooks remain composed.

## Acceptance evidence

- [ ] Complete set reconciliation, deterministic resource paths, exact contribution evidence, project trust, and ordinary hook execution pass through real composed seams.
- [ ] No hook process executes before startup or after runtime abort; stale/other-session events fail.
- [ ] Session lease replacement/release and live callback shutdown preserve artifacts.
- [ ] Subagent start/stop registration, parent mismatch, qualification mismatch, absent adapter, and idempotent disposal are covered.
- [ ] Partial startup leaves no active delegate, lease, coordinator, or registration.

## Ordering constraint

Consumes runtime selection/capabilities. It may proceed in parallel with MCP composition; reload convergence requires both.

## Implementation notes

- Added construct-time inert Pi runtime delegates that receive targets only during explicit startup and enforce the exact session binding before forwarding any ordinary hook event.
- Composed the existing snapshot loader, skill/hook participant, manifest skill verifier, resource observer, planner, execution context, guarded command executor, Pi adapters, and continuation guard behind one session-owned runtime.
- Added exact parent-session resolution, production-only optional subagent qualification/aggregate registration, session revision lease replacement, reverse partial cleanup, and idempotent shutdown. Test-provider evidence never registers as production capability.
- Verification: new composition/delegate/session suites and existing skill/hook/subagent integration suites passed (26 tests); `npm run typecheck` and `npm run boundaries` passed.
