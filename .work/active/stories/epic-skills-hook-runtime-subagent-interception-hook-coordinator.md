---
id: epic-skills-hook-runtime-subagent-interception-hook-coordinator
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-subagent-interception
depends_on: [epic-skills-hook-runtime-subagent-interception-lifecycle-contract-probe]
release_binding: null
gate_origin: null
research_refs: [docs/research/pi-subagents-lifecycle-interception.md]
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Adapt Subagent Boundaries into the Existing Hook Runtime

## Priority

High; implementable after the public lifecycle contract.

## Deliverable

Generalize the existing strict event plan/input/output policy from ordinary-only to executable ordinary-or-subagent events. Add exact `SubagentStart` and `SubagentStop` input builders, agent-type matching, parent-session resolution, and one aggregate lifecycle interceptor that reuses `createHookEventPlanner`, `GuardedCommandHookExecutor`, `parseHookHandlerOutput`, and `aggregateHookDecisions`.

Do not add a subagent-specific process runner, output parser, aggregation policy, diagnostic vocabulary, configuration resolver, trust check, catalog, or continuation service.

## Planned files

- `src/domain/hook-runtime-contract.ts`
- `src/domain/hook-output-contract.ts`
- `src/runtime/hooks/event-contract.ts`
- `src/runtime/hooks/event-input.ts`
- `src/runtime/hooks/hook-event-planner.ts`
- `src/runtime/hooks/hook-output-parser.ts`
- `src/runtime/hooks/hook-decision-aggregator.ts`
- `src/runtime/subagents/subagent-hook-session-context.ts`
- `src/runtime/subagents/subagent-hook-coordinator.ts`
- contract/parser/planner/aggregator tests in their existing mirrored directories
- `test/runtime/subagents/subagent-hook-coordinator.test.ts`

## Exact mapping

- Parent `session_id`, actual optional transcript, cwd, `agent_id`, and `agent_type` are foreign fields. Child session/run/execution/outcome/round evidence is only under `pi.subagent`.
- `SubagentStart` does not invent a foreign `prompt` field. The exact assembled prompt remains internal and is replaced only from accepted context/block decisions.
- `SubagentStop.last_assistant_message` is the actual proposed result before finalization.
- Matcher candidates are the exact `agentType` only. Existing all/set/regex compilation remains authoritative.
- Matching hooks run through existing bounded concurrency and aggregate by existing source order.
- Start context appends exactly as `prompt + "\n\n" + contexts.join("\n\n")`; no contexts preserves bytes. Block/stop/error/cancel aborts before prompt.
- Stop without continuation completes the exact result. Continuation prompt is ordered contexts plus safe reason, with one fixed fallback. Round at budget aborts with `continuation-limit`.
- Unsupported permission/input/tool-output/title/terminal/watch/env/reload fields remain explicit errors.

## Snapshot, scope, and secret semantics

One catalog/selection snapshot is taken per lifecycle boundary. A continuation is a new completion boundary and sees a new verified catalog while retaining identity. Each command still revalidates active binding, roots, project/trust, and callback-scoped configuration before spawn; a race fails the whole boundary without partial decisions.

A private session port resolves an actual parent id to existing `HookSessionEvidence`. Parentless service runs are unmanaged pass-through. A claimed but unresolved/stale parent fails closed when active hooks require it.

Prompt/result values are callback-lifetime. The start prompt is never serialized; the proposed result appears only in documented stop stdin and immediate decisions. Existing configured-value redaction runs before accepted hook output crosses the callback; diagnostics/evidence never contain raw input/output/native causes.

## Acceptance evidence

- [ ] Strict schemas prove exact field presence and absence for both subagent events.
- [ ] Compatibility selector and runtime matcher cannot disagree; agent ids/session ids are never aliases.
- [ ] Multi-plugin/scope handlers aggregate deterministically despite inverse completion.
- [ ] Start no-op/context/block/error/cancel vectors produce exact prompt-or-abort decisions.
- [ ] Stop complete/context/reason/exit-2/error/cancel/round-bound vectors produce exact complete/continue/abort decisions.
- [ ] Parentless, stale parent, project mismatch, trust revocation, update/disable race, and runtime disposal have explicit non-partial behavior.
- [ ] Initial/resume and every continuation use supplied immutable identity/path; the coordinator does not create run ids or sessions.
- [ ] Secret canaries cannot escape into diagnostics, activation/capability evidence, state, logs, or snapshots.
- [ ] No new process, settings, package, event-observation, post-completion resume, or subagent-runtime implementation exists.

## Ordering

Depends on the lifecycle contract/probe. It may implement in parallel with fake/conformance. Composition depends on both.

## Blocker ownership

None. This is package-independent and can be tested with direct port requests/stubs before a production package exists.

## Risk and rollback

The highest risk is mixing plugin revisions or finalizing a result around continuation. Per-boundary plan snapshots, existing active authority, all-or-nothing aggregation, exact continuation decisions, and the external runtime conformance boundary contain those risks. Rollback removes subagent variants/coordinator while ordinary hook behavior and capability unavailability remain intact.

## Implementation summary

- Generalized the existing strict foreign-input, executable-plan, output-policy, parser, matcher, guarded-executor, and aggregator path to `SubagentStart`/`SubagentStop`; no parallel command runtime was introduced.
- Added exact secret-bounded subagent inputs: parent session fields remain foreign fields, child run/path evidence is under `pi.subagent`, start never serializes the prompt, and stop sends the proposed result only as `last_assistant_message` for the immediate callback.
- Added the private parent-session resolver and aggregate coordinator. It selects by exact `agentType`, preserves no-hook/parentless bytes, resolves claimed parents, delegates active-binding/configuration/redaction checks to the guarded executor, appends start contexts exactly, maps stop feedback to same-session continuation, enforces round 3, propagates caller cancellation, and disposes idempotently.

## Implementation record

- Execution capability: `xhigh feature owner`; dependency-ordered direct implementation with no nested agents.
- Commit ref: `017b6a1` (`implement: portable subagent hook coordinator`).
- Verification: `npm run typecheck`; `npm run boundaries` (220 modules, 1,313 dependencies, zero violations); 60 focused domain/runtime/integration Vitest tests passed.
- Reuse: existing selector compiler, verified catalog snapshot, guarded command executor, callback-scoped authority/configuration/redaction, diagnostics, and source-order aggregation remain authoritative.
