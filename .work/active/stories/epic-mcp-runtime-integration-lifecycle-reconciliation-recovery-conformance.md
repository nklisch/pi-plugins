---
id: epic-mcp-runtime-integration-lifecycle-reconciliation-recovery-conformance
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-lifecycle-reconciliation
depends_on: [epic-mcp-runtime-integration-lifecycle-reconciliation-reconciliation-participant, epic-mcp-runtime-integration-lifecycle-reconciliation-runtime-lease-cleanup]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prove Lifecycle Compensation and Recovery Reuse

## Checkpoint

Compose the package-neutral MCP participant with the existing lifecycle service, transition reconciler, startup recovery service, skill/hook contribution, fake runtime, and fake revision leases. Demonstrate that whole-plugin install/enable/update/disable/uninstall, candidate failure, verified rollback, crash replay, cancellation, stale identity, and cleanup ambiguity use the existing pending transition and journal rather than an MCP transaction engine.

## Planned files

- `test/application/lifecycle-transition-reconciler.test.ts`
- `test/application/recovery-service.test.ts`
- `test/integration/mcp-lifecycle-recovery.test.ts`
- `test/integration/plugin-lifecycle.test.ts`
- supporting test-only fake controls in `test/support/fakes/mcp-runtime.ts`

Production lifecycle/recovery source should not gain an MCP-specific mutation path. A source edit is allowed only to consume the strict MCP observation type while preserving existing authority and outcomes.

## Required behavior

- A test-only `LifecycleReloadPort` maps only participant `applied | unchanged` to reload accepted and obtains strict skill/hook plus MCP observation independently.
- Candidate replacement rejection preserves the previous source.
- Applied-but-partial, lost-response, duplicate inspection, cancellation-after-effect, and remove-cleanup failure cannot finalize.
- Compensation treats candidate as `from`, cleans candidate residue even when registration appears absent, restores/removes the previous exact state, and observes it before `rolled-back`.
- A third/newer same-owner source is stale and never overwritten during forward or compensation.
- Startup recovery classifies exact candidate observation through existing rules; mismatch/absence uses existing compensation. It never reruns install/update or creates MCP replay state.
- Inactive/no-MCP transitions remain idempotent and exact. Remote launch health remains outside lifecycle outcomes.

## Acceptance evidence

- [ ] Complete skill/hook/MCP fixture passes install → disable → enable → update → uninstall with exact source identities and complete composed observations.
- [ ] No-MCP install/enable/update/disable/uninstall contributes explicit none/absence evidence and works without a production runtime.
- [ ] Failed candidate returns verified `rolled-back` only after old state and old exact MCP source are observed.
- [ ] Restore replace failure, restore remove failure, restore observation mismatch, lease cleanup failure, or third identity yields `recovery-required` with existing pending/journal evidence.
- [ ] Crash before mutation, after candidate publish, during partial removal, after removal before finalization, during compensation, and after restore before settlement replays idempotently.
- [ ] Cancellation before effect is clean; cancellation after possible effect resolves only by exact observation/compensation/recovery.
- [ ] Unrelated scope/plugin state mutations preserve lifecycle's bounded target-only generation rebase; no MCP code owns locking or state CAS.
- [ ] Same native keys across user/project and distinct plugins remain isolated through replacement, removal, status, process cleanup, and leases.

## Ordering constraint

Depends on both the reconciliation participant and runtime-lease cleanup. The final integration/native-handoff checkpoint depends on this proof.

## Implementation notes

- Added a test-only `LifecycleReloadPort` that maps only MCP `applied | unchanged` to accepted, independently obtains strict skill/hook and MCP observations, and composes them through the existing whole-plugin observation contract.
- Exercised the real `createLifecycleTransitionReconciler` with exact whole-bundle update finalization, partial/lost-response candidate compensation, failed restore, crash-after-publication finalization, crash-during-partial-publication rollback, explicit offline no-MCP finalization, and unregister-before-cleanup recovery-required retention.
- Extended the fake's absent replacement semantics so publication must clean same-owner residue left by partial removal before it may return `applied`. Cleanup failure preserves process/lease residue and safe pending evidence rather than claiming inactive or restored state.
- Recovery uses only the existing transition record, pending marker, state generation CAS/rebase, reload observation, settlement, and recovery-required outcomes. No MCP journal, transaction, state store, retry worker, commit path, or recovery classifier was added.

## Verification

- Focused MCP lifecycle/recovery/runtime/fake/conformance/plugin-lifecycle suites: **69 passed, 0 failed**.
- `npm run typecheck`: passed.
- `npm run boundaries`: passed (**237 modules, 1,444 dependencies**, no violations).
