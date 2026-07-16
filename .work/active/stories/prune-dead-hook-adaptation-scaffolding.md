---
id: prune-dead-hook-adaptation-scaffolding
kind: story
stage: done
tags: [refactor]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prune Dead Hook-Adaptation Scaffolding

## Brief

Remove the unused aliases, aggregate placeholder types, helper, parameter, and re-export seams left inside the completed hook event-adaptation implementation. These declarations have no source or test consumer, are excluded from the package barrel, and do not participate in Pi event mapping, selector compilation, hook planning, input snapshots, or execution.

This is elimination-only. It must not change the hook registry, accepted matcher/condition grammar, foreign input fields, Pi event mapping/order, cancellation evidence, strict tool-result content snapshot, selected-hook ordering, public package exports, or any runtime result.

## Source lens

- **Primary**: dead weight / elimination
- **Secondary**: naming and module ownership — remove aliases that suggest contracts or ownership which do not exist
- **Value**: high for a surgical story; eliminates roughly twenty false internal seams and their supporting imports from one cohesive runtime area instead of carrying them into the dependent guarded-command feature

## Evidence

Repository-wide exact-identifier scans across `src/` and `test/` at `b4fdc40` found no consumer beyond each declaration for:

- `src/runtime/hooks/event-input.ts:96-102` — seven `build*HookInput` aliases duplicate the actual `build*Input` functions consumed by `hook-event-planner.ts`.
- `src/runtime/hooks/event-contract.ts:97,138-141` — `OrdinaryHookInput`, `HookEventInput`, `HookEventName`, `HookPlanDigestEvidence`, and `HookContractTypes` are unreferenced aggregate/alias types. `HookContractTypes` alone keeps several otherwise-unneeded type imports alive.
- `src/runtime/hooks/hook-event-planner.ts:86-88` — `isJsonObject` is never called. Its `z`, `JsonValueSchema`, and `JsonValue` imports are consequently unused; `OrdinaryHookEventSchema` and `sessionSource` are also imported but unused.
- `src/runtime/hooks/hook-event-planner.ts:162,178` — `select` accepts `inputValue`, but never reads it; `makePlan` passes it only to that dead parameter before using it independently to construct the plan.
- `src/runtime/hooks/tool-event-input.ts:53-55,178-179` — `staticOrDynamicRows` is a one-call pass-through to `validateHookToolAliasDefinitions`; the module's re-exports of `HookToolAliasDefinition`, `HookToolAliasDefinitionSchema`, `HookToolAliasDefinitionRegistry`, and `canonicalJson` have no consumer. The planner and Pi adapter can name the authoritative domain type directly.

`test/public-api-hook-adaptation.test.ts` explicitly proves planner, event-plan, alias-registry, roots, signals, and Pi adapter details are absent from `src/index.ts`. Package `exports` exposes only `dist/index`, so deleting these unconsumed internal module exports does not alter the supported public API.

## Current state

```ts
// event-input.ts: duplicate names with no importers
export const buildSessionStartHookInput = buildSessionStartInput;
// ...six equivalent aliases...

// event-contract.ts: unconsumed aggregate placeholders
export type HookEventInput = ForeignHookInput;
export type HookPlanDigestEvidence = Readonly<{
  revision: ContentDigest;
  projectionDigest: ContentDigest;
  contributionDigest: ContentDigest;
}>;
export type HookContractTypes = Readonly<{ /* unrelated contract bundle */ }>;

// hook-event-planner.ts: unused helper and argument
function isJsonObject(value: unknown): value is Record<string, JsonValue> { /* ... */ }
function select(event, session, subject, inputValue) { /* inputValue is not read */ }

// tool-event-input.ts: false ownership aliases
function staticOrDynamicRows(additional) {
  return validateHookToolAliasDefinitions(additional);
}
export { HookToolAliasDefinitionSchema, HookToolAliasDefinitionRegistry, canonicalJson };
```

## Target state

- Retain only the input builders actually imported by the planner.
- Retain only event-contract types used by production or tests.
- Remove `isJsonObject`, its now-unused imports, and the dead `select` parameter/call argument.
- Call `validateHookToolAliasDefinitions` directly and import `HookToolAliasDefinition` from `domain/hook-runtime-contract.ts` where needed; remove the runtime module's pass-through exports.
- Make no changes to schemas, planner branches, selector subjects, event input values, Pi adapters, tests, documentation, or package barrel exports except import cleanup required by the deletions.

## Risk

**Low.** Every target is either unreferenced or a transparent one-call/one-name pass-through, and none is exported from the package entry point. The main risk is accidentally deleting an authoritative builder/schema rather than only its alias, or changing `makePlan` while removing the unused `select` argument. Keep the diff deletion-focused and let typecheck plus focused planning/Pi tests catch import or call-site mistakes.

Rollback is a direct revert of this story's implementation commit; there is no state, cache, migration, trust, lifecycle, Pi contract, or generated artifact impact.

## Verification

- [ ] Exact repository-wide identifier search shows every named dead declaration above is absent and no consumer was edited around a missing contract.
- [ ] `hook-event-planner.ts` retains the same `HookEventPlanSchema.parse` input and the same branch/event order; only the unused `select` argument disappears.
- [ ] `tool-event-input.ts` still uses the authoritative domain registry/compiler and retains `evaluateHookConditions`, which is intentionally exercised by focused tests.
- [ ] Focused hook contract, planner, tool input, Pi adapter, mutation-snapshot, and hook-adaptation integration tests pass.
- [ ] Source and compiled public API allowlists remain unchanged.
- [ ] Full `npm test` passes when dependencies are installed.

## Dependencies and cycle check

- `depends_on: []`: the hook adaptation feature and its review hardening are already done; this standalone cleanup does not need an implementation dependency on completed work.
- Post-emission `.work/bin/work-view --scope all --blocking prune-dead-hook-adaptation-scaffolding` returned no dependents. With an empty dependency list there is no outgoing edge and therefore no possible dependency cycle.

## Implementation notes

- Removed all named unconsumed hook-input aliases, aggregate contract types, planner helper/imports/dead selector argument, and tool-identity pass-through ownership seams.
- Guarded-command implementation was proactively steered to import authoritative domain types/builders rather than these deleted false seams.
- No schema, registry, matcher, planner branch, Pi event, content snapshot, package barrel, or public runtime behavior changed.
- Focused hook contract/planner/tool/Pi/integration coverage passes (45 tests) with production typecheck clean.
- Execution capability: direct host implementation; one deletion-only standalone refactor with a bounded diff.

## Review (2026-07-16)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none
**Rejected**: none

Bounded inline standalone-story review confirmed every removed declaration/pass-through had no consumer, planner/event order and strict content snapshot remain unchanged, and the concurrently implementing guarded-command feature was steered to authoritative domain seams. Full `npm test` passes: 146 files / 761 tests, typecheck, boundaries, build/package import, and unchanged 463 exports.
