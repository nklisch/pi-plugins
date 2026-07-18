---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-startup-recovery
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: [epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts, epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Reconcile Interrupted Transitions at Startup

## Checkpoint

Implement bounded local startup recovery over authoritative state and durable journals, then identify and remove only dead-owned expired staging/prepared roots. Recovery classifies evidence and delegates state/reload effects to the shared transition reconciler; it never reruns a lifecycle command.

## Required files

- `src/application/recovery-service.ts`
- `src/application/ports/lifecycle-state-inventory.ts`
- `src/application/ports/recovery-artifacts.ts`
- `src/infrastructure/filesystem/staging-allocator.ts`
- `src/infrastructure/recovery/recovery-artifact-scanner.ts`
- focused application/infrastructure tests

## Constraints

- Required recovery defaults to 2,000 ms and 128 transitions; referenced transitions run before unreferenced cleanup.
- Exact candidate-pending plus candidate observation finalizes. Any candidate error/mismatch conservatively compensates previous state through the reconciler. Exact previous-pending resumes compensation.
- Missing/quarantined journal evidence, corrupt state, target conflict, or unavailable previous evidence blocks only the affected plugin/scope and retains artifacts.
- Live/unknown operation owners are never taken over. Dead or explicitly released/recovery-required owners may be reconciled.
- Staging owner sidecars stay outside materializer-visible slots. Deletion requires proven death, 24-hour grace, parent/root capability, and device/inode identity.
- No source/network, materialization, inspection, trust, configuration collection, promotion, runtime component execution, or operation-facade call is allowed.

## Acceptance evidence

- [ ] Crash matrix covers prepare, first commit, candidate reload/observation, compensation commit/reload, pending clear, and journal settlement.
- [ ] Results are only exact finalized, verified rolled-back, abandoned, deferred, or blocked variants with safe references.
- [ ] Candidate reload is never retried after indeterminate observation; previous verification remains mandatory.
- [ ] User/project and unrelated-plugin recovery remains isolated under corruption, contention, and budget exhaustion.
- [ ] Live/unknown staging is retained; only dead-owned expired and identity-stable staging/prepared trees are removed.
- [ ] A test spy proves recovery never enters forbidden lifecycle/source/trust/runtime surfaces.

## Ordering

Consumes the shared reconciler and durable journal. Integration hardening waits for this checkpoint.

## Implementation notes

Implemented bounded startup recovery over authoritative state and per-scope journals. It processes pending references deterministically before abandoned prepared rows, respects the 2,000 ms / 128-record policy, observes candidate activation without treating reload invocation as proof, delegates all state transitions to the shared reconciler, and returns safe finalized/rolled-back/deferred/blocked results. Corrupt scopes and missing journal evidence are isolated. Staging allocation now records an adapter-private owner sidecar outside the materializer-visible slot; the recovery scanner issues opaque, identity-bound candidates and refuses live/unknown or replaced roots.

Verification evidence:

- `npm run typecheck` — passed.
- `npm run test:unit -- --run test/application/recovery-service.test.ts test/infrastructure/recovery/recovery-artifact-scanner.test.ts` — 2 files / 3 tests passed.
- Recovery spy coverage confirms corrupt state does not enter lifecycle command, reload, source, or artifact deletion surfaces; scanner coverage confirms live-owner takeover is refused.
