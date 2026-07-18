---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Define Recovery Contracts and Share Transition Reconciliation

## Checkpoint

Finalize the version-1 transition/journal vocabulary and extract the existing lifecycle finalization, compensation, bounded target-preserving rebase, reload, and exact observation logic into one internal reconciler used by both ordinary operations and startup recovery. This checkpoint must make recovery possible without exposing an arbitrary state mutation or lifecycle-command replay surface.

## Required files

- `src/application/plugin-lifecycle-contract.ts`
- `src/application/plugin-lifecycle-service.ts`
- `src/application/lifecycle-transition-reconciler.ts`
- `src/application/recovery-contract.ts`
- `src/application/ports/lifecycle-clock.ts`
- `src/application/ports/lifecycle-transition-store.ts`
- focused application tests

## Constraints

- Store pending-free previous/candidate/final state plus exact previous/candidate projection expectations; keep references derived from operation/scope/plugin/starting generation.
- Journal states are `prepared`, resumable `recovery-required`, terminal `completed|rolled-back|abandoned`, and isolated `quarantined`; conflicting terminal edges fail closed.
- Ordinary lifecycle results remain stable. Every unresolved post-commit path marks the journal recoverable where possible.
- Recovery code may call only the reconciler; it cannot construct arbitrary replacements, invoke install/update, promote content, or skip reload observation.
- Domain/application code imports no Node, SQLite, filesystem, process, Pi, or runtime implementation.

## Acceptance evidence

- [ ] Contract vectors reject forged references, projection evidence, pending-bearing states, unsafe fields, and illegal status transitions.
- [ ] One reconciler owns pending clear, previous-state restoration, reload/observe comparison, and bounded exact-target rebase.
- [ ] Operation and startup entry paths produce identical outcomes for candidate success, verified rollback, unrelated generation advance, target change, finalization ambiguity, and rollback ambiguity.
- [ ] No public or internal caller can request arbitrary lifecycle state replay or component-specific recovery.
- [ ] Existing lifecycle service behavior and focused tests remain green.

## Ordering

This is the root checkpoint. The journal adapter, startup recovery, and collection contracts depend on its settled record/status/reconciler surface.

## Implementation notes

Implemented the version-1 transition vocabulary with pending-free previous/candidate/final state evidence, separate candidate and previous projection expectations, deterministic reference verification, resumable recovery status, terminal status conflict handling, safe recovery result contracts, and an injected lifecycle clock port. Extracted the guarded pending replacement/rebase, exact reload observation comparison, finalization, verified previous compensation, and startup classification surface into `LifecycleTransitionReconciler`; the lifecycle facade now routes both successful and failed post-commit outcomes through it. Legacy transition-store fakes remain source-compatible through the normalized constructor input, while emitted records use the stronger dual-projection shape.

Verification evidence:

- `npm run typecheck` — passed.
- `npm run test:unit -- --run test/application/recovery-contract.test.ts test/application/lifecycle-transition-reconciler.test.ts test/application/plugin-lifecycle-service.test.ts` — 3 files / 9 tests passed.
- Existing lifecycle install/disable/enable/uninstall and generation-rebase behavior remained green; no lifecycle command replay or arbitrary state replacement surface was added.
