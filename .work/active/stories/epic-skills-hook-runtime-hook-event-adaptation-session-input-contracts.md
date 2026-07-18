---
id: epic-skills-hook-runtime-hook-event-adaptation-session-input-contracts
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: [epic-skills-hook-runtime-hook-event-adaptation-contract-registry]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Build strict session and lifecycle event plans

## Checkpoint

Define strict schema-derived session, transcript, cancellation, foreign input, selected-hook, and event-plan contracts, then plan non-tool lifecycle events from the verified `SkillHookRuntimeCatalog` without executing commands or applying Pi decisions.

## Design element

- Add `src/runtime/hooks/event-contract.ts`, `event-input.ts`, and the non-tool portions of `hook-event-planner.ts`.
- Map session-start reasons exactly, omit ephemeral `transcript_path`, map compaction triggers, and produce ordered `PostCompact` then `SessionStart(source=compact)` only after completed compaction.
- Build `SessionEnd`, raw pre-expansion `UserPromptSubmit`, and settled-only `Stop` inputs with strict event field allowlists and a `pi` evidence namespace.
- Require explicit current-project/Pi-trust agreement and explicit Stop continuation state. Preserve catalog/snapshot ordinals, projection bindings, and adapter-returned plugin/data roots in private selected-hook plans.
- Represent exact available `AbortSignal` evidence or explicit absence; never fabricate a signal, permission mode, shutdown reason, transcript path, or assistant message.

## Acceptance evidence

- Contract tests reject extra or unavailable foreign fields, native causes, secrets, and non-JSON evidence.
- Goldens cover all Pi session-start and compaction reasons, persisted/ephemeral sessions, every non-tool input key set, cancelled/failed compaction, and exact two-plan post-compaction order.
- Catalog tests cover user/project same-key isolation, trust revocation, Pi trust disagreement, stale project context, projection/root mismatch, selector recompilation disagreement, no matches, and stable source ordering.
- Stop tests prove it is planned only at settled-agent input, uses actual branch assistant text when present, omits it otherwise, and requires caller-supplied `stop_hook_active`.
- No test or source path calls process, shell, configuration, secret, state, transition, or reload APIs.

## Ordering constraint

Depends on `epic-skills-hook-runtime-hook-event-adaptation-contract-registry`. It may proceed in parallel with the tool-event checkpoint once the registry is complete.

## Implementation notes
- Execution capability: GPT-5.6 Luna inline; strict event contracts and host-neutral planning share one cohesive boundary.
- Review weight: standard (caller explicitly prohibited review for this delegated run).
- Files changed: `src/runtime/hooks/event-contract.ts`, `src/runtime/hooks/event-input.ts`, `src/runtime/hooks/hook-event-planner.ts`, `test/runtime/hooks/fixtures.ts`, `test/runtime/hooks/event-contract.test.ts`, `test/runtime/hooks/hook-event-planner.test.ts`.
- Tests added/removed: strict field rejection, source/trigger mapping, compact order, cancellation absence, catalog order, trust mismatch, and selector corruption tests.
- Simplification: one immutable plan shape and one catalog selection path serve every ordinary lifecycle event; no execution or second runtime state was introduced.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, focused runtime contract/planner suites green.
