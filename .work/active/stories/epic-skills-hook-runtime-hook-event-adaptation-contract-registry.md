---
id: epic-skills-hook-runtime-hook-event-adaptation-contract-registry
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-hook-event-adaptation
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Establish the hook event and selector contract registry

## Checkpoint

Create the one domain source of truth for hook event ownership/Pi boundaries, tool aliases, matcher subjects, and supported tool-condition grammar. Make compatibility evaluation consume the same selector compiler runtime planning will use so invalid events, matchers, conditions, and event/field combinations fail before projection.

## Design element

- Add `src/domain/hook-runtime-contract.ts` with registry-derived schemas and pure selector compilation/evaluation contracts.
- Derive the existing supported, subagent, and incompatible event catalogs in `src/domain/compatibility-policy.ts` from that registry instead of maintaining a parallel list.
- Move the evaluator-private condition parser into the shared contract and validate matcher syntax/applicability as part of `evaluateCompatibility`.
- Keep `SubagentStart`/`SubagentStop` requirement-gated but outside the ordinary event owner; keep `PermissionRequest` and unknown events incompatible.
- Keep compiled regex/closures ephemeral. Do not alter installed state, runtime projection/cache shapes, trust identities, or normalized `HookComponent` persistence.

## Acceptance evidence

- Registry contract tests enumerate every event, owner, Pi boundary, matcher subject, condition field/operator, and static alias row.
- Matcher vectors cover absent/empty/`*`, pipe/comma exact sets, anchored/unanchored case-aware regex, invalid/oversized expressions, and matcher use on events with no subject.
- Condition vectors cover predicate/wrapper/AND-array forms, operator value kinds, canonical JSON use, event-specific field applicability, invalid regex, unknown syntax, and empty/contradictory declarations.
- Compatibility table fixtures prove every accepted declaration is supported and every unsupported declaration is source-located, redacted, and incompatible before projection.
- Existing supported/subagent/incompatible event counts and runtime requirement behavior remain stable.

## Ordering constraint

This checkpoint has no sibling dependency. Session and tool planning both depend on its registry/compiler and must not implement local selector grammar while this work is incomplete.

## Implementation notes
- Execution capability: GPT-5.6 Luna inline; the registry/evaluator boundary is cohesive and was implemented without nested agents or review.
- Review weight: standard (caller explicitly prohibited review for this delegated run).
- Files changed: `src/domain/hook-runtime-contract.ts`, `src/domain/compatibility-policy.ts`, `src/domain/compatibility-evaluator.ts`, `test/domain/hook-runtime-contract.test.ts`.
- Tests added/removed: table-driven registry, matcher, condition, alias, and compatibility-policy derivation tests.
- Simplification: compatibility event partitions and condition vocabulary now derive from one registry/compiler; the evaluator no longer owns a separate condition decision path.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, focused domain suites green.
