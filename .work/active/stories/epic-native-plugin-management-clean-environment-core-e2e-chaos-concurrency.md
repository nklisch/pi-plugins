---
id: epic-native-plugin-management-clean-environment-core-e2e-chaos-concurrency
kind: story
stage: done
tags: [e2e-test, testing]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [epic-native-plugin-management-clean-environment-core-e2e-golden-journeys, epic-native-plugin-management-clean-environment-core-e2e-failure-recovery]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-18
updated: 2026-07-18
---

# Prove deterministic crash, contention, network, and clock recovery

## Scope

Implement Unit 4 from the parent feature after golden/failure baselines are trustworthy. Inject only failures for which the product already defines recovery, rollback, fallback, coalescing, or pause behavior: source-publication kill, lifecycle/reload kill, multiprocess contention, Git network loss, and wall-clock regression.

Use external process/service/filesystem phase observation. Do not add production test hooks, source forks, in-process clocks, random chaos, PID takeover, or assertions against mock calls.

## Files

- `test/e2e/chaos/lifecycle-crash-recovery.e2e.test.ts`
- `test/e2e/chaos/multiprocess-network-clock.e2e.test.ts`

## Scenarios

1. Kill the real Pi process after verified source bytes reach private publication staging but before authority selects them; restart and retry must produce one selected revision and collectible inert residue only.
2. Kill after a lifecycle pending candidate is externally visible but before reload-result handoff; restart recovery must publish one complete candidate or restore one complete previous revision before resources appear.
3. Run two real Pi RPC processes against one agent/project and contend on same-target and different-target install/update/uninstall; one same-target winner plus current/conflict peer is required, with no partial resource/state split.
4. Kill the Git service during refresh/update acquisition; old selected catalog/revision remains usable and offline restart performs zero request.
5. Restart the complete Pi process under pinned `libfaketime` with wall time behind persisted schedule anchors; status pauses as `clock-regressed`, does not spin, and normal-time restart resumes without duplicate notice/update.

## Acceptance criteria

- [ ] Fault triggers are named, externally observable, deadline-bounded, and recorded in sanitized artifacts; no arbitrary sleep determines a kill.
- [ ] Every restart completes recovery before public resource/list assertions.
- [ ] Same-target contention has exactly one authoritative mutation; all processes agree on final state and resource discovery.
- [ ] Different-target work is not globally serialized beyond existing scope guarantees, and database integrity remains valid.
- [ ] Network loss changes only freshness/backoff/attempt evidence and never disables the active revision or blocks offline startup.
- [ ] Clock regression produces no busy loop or network call; explicit local commands remain responsive and durable notice identity is unchanged.
- [ ] Paused processes are always resumed before teardown; all process groups, ports, OS locks, SQLite handles, and staging are released.
- [ ] No scenario reports success from progress, candidate bytes, a journal row, or callback alone; independent Pi/resource/file observations are required.

## Test integrity

Park any real crash/concurrency bug through `/agile-workflow:park`, preserve the deterministic reproducer and honest assertion, and link any temporary xfail. Fix bad phase detection, service faults, and timing assumptions in-session. Never rerun-until-green, broaden expected outcomes beyond the actual contract, or delete a race because it is inconvenient.

## Implementation notes

- Execution capability: GPT-5.6 Sol xhigh, caller-selected; deterministic process/service fault ownership stayed with the feature owner and used no nested agents.
- Review weight: standard from `.work/CONVENTIONS.md`; child-story checkpoint does not receive review.
- Files changed: `test/e2e/chaos/{lifecycle-crash-recovery,multiprocess-network-clock}.e2e.test.ts` plus shared process-fault controls.
- Tests added: Pi kill at a real Git backend phase and exact retry; pending lifecycle/reload kill; two-process same/distinct registration contention; Git process-group loss with old-catalog/offline restart; and complete-Pi clock regression with pinned libfaketime receipt.
- Simplification: fault triggers are service phase files/signals only, with one fixed Git listener and one process-group owner; no sleeps, random chaos, production hook, fake clock, or SQLite mock exists.
- Discrepancies from design: a dead refresh claim coalesces the one retry, distinct-target adds expose `STATE_STALE`, and lifecycle crash cannot reach a pending transition until production projection publication works. This host lacks pinned libfaketime, so the clock test records/asserts explicit capability diagnosis; `PI_PLUGIN_HOST_E2E_REQUIRE_LIBFAKETIME=1` makes Linux CI fail closed when absent.
- Adjacent issues parked: `idea-recover-crashed-refresh-claim`, `idea-distinct-marketplace-add-contention`; `idea-production-projection-publication` remains linked to lifecycle/reload crash.
- Verification: all chaos files passed (5 tests including linked executable expected failures); network kill/offline restart and capability diagnosis are green.
