---
id: epic-transactional-plugin-lifecycle-operations-guarded-transitions
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-operations
depends_on: [epic-transactional-plugin-lifecycle-operations-contracts-preparation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Orchestrate guarded whole-plugin transitions

## Scope

Implement Unit 2 of the parent design. Add the single `PluginLifecycleService` facade for install, enable, disable, update, and uninstall plus one internal guarded transition/compensation path. Compose the completed generation coordinator, content promotion, authoritative state, prepared projection, durable transition, reload, and observation contracts. Do not implement concrete Pi reload/runtime adapters, transition persistence, startup recovery, garbage collection, update policy, commands, UI, or foreign-state reading.

## Depends on

- `epic-transactional-plugin-lifecycle-operations-contracts-preparation`

## Required files

- `src/application/plugin-lifecycle-service.ts`
- `test/application/plugin-lifecycle-service.test.ts`

## Design constraints

- Expose only the five operation methods; no public raw commit, promotion, component activation, skip-verification, or recovery mutation method.
- Long preparation and projection work finish before coordination. Inside `runPreparedMutation`, only assert ownership, promote install/update content, build the exact verified mutation, and commit.
- Prepare durable transition evidence before the first state commit. Authoritative state carries only its opaque pending reference.
- Rebase scope-generation changes only while the exact target plugin state/pending precondition is unchanged. A changed target or unknown pending transition stops the operation.
- Reload acceptance is not success. Compare independent observation of exact scope/plugin active state, revision, and projection digest.
- On activation failure, restore previous state with pending evidence, reload again, verify the previous expectation, then clear pending. Return `rolled-back` only after both state and runtime are proved.
- Return `recovery-required` for ambiguous commit, finalization, compensation, or observation; never recommend blind retry or report the previous revision working without evidence.
- Uninstall deactivates before record removal. Immutable content cleanup is deferred. Data/configuration/secret cleanup intent requires `delete-confirmed`; disable cannot request cleanup.
- State-derived no-op behavior replaces caller idempotency keys. Do not add timers, lease policy, workflow DSLs, retry databases, or same-user adversarial defenses.

## Acceptance criteria

- [ ] Install/update commit only complete activatable, trusted, configured candidates and promote only under coordinator ownership.
- [ ] Enable/disable/update/uninstall affect one complete plugin and cannot select individual skills, hooks, or MCP servers.
- [ ] Same selected revision/intent and missing uninstall are deterministic `unchanged` results; wrong operation state is a typed rejection.
- [ ] Unrelated scope generation churn may rebase without rematerialization; changed target/pending state cannot be overwritten.
- [ ] Success requires committed candidate, exact reload observation, and pending-clear finalization.
- [ ] Reload rejection/mismatch returns `rolled-back` only after verified previous-state reload; failed proof returns `recovery-required` with safe pending evidence.
- [ ] Cancellation before commit preserves prior state and cleans staging; after possible commit it yields proved completion/rollback or `recovery-required`.
- [ ] Focused tests cover the operation table and major commit/reload/rollback outcomes without cloning lower-level concurrency or filesystem suites.

## Implementation notes
- Execution capability: direct host implementation; one facade and one guarded transition path share state, promotion, reload, and compensation ownership, and the caller prohibited agents.
- Review weight: standard, caller did not override the project default.
- Files changed: `src/application/plugin-lifecycle-service.ts`, `test/application/plugin-lifecycle-service.test.ts`.
- Tests added/removed: schema-valid in-memory lifecycle flow covering install, disable, enable, same-revision update no-op, uninstall cleanup intent, missing-operation idempotence, and verified rollback after reload rejection.
- Simplification: one `execute` path, one coordinator callback for first commit, one finalization helper, and one rollback helper; no request keys, timers, component-specific methods, or retry store.
- Discrepancies from design: concrete adapters remain injected ports; stale rebasing is bounded to one retry when the exact target is unchanged, with ambiguous evidence returned as recovery-required.
- Adjacent issues parked: none.

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent integrated verification. Full suite passes 561 tests with strict production/test typechecking, clean boundaries, build, and exact 360-export package import. Acceptance evidence is complete and no realistic normal-use blocker remains.
