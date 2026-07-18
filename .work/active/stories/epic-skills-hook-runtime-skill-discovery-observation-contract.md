---
id: epic-skills-hook-runtime-skill-discovery-observation-contract
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Bind current-project and resource evidence into skill/hook observation

## Checkpoint

Evolve the completed skill/hook snapshot catalog so a reconcile carries exact current-project context even when the active set is empty, and split source-catalog observation from the final `skills-hooks` contribution accepted by lifecycle composition. Add a strict pure composer that requires matching resource-contribution evidence and exact projected/contributed skill component ids.

## Files

- `src/runtime/skill-hook/runtime-catalog.ts`
- `src/runtime/skill-hook/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/runtime/skills/contribution-observation.ts`
- `test/runtime/skill-hook/lifecycle-participant.test.ts`
- `test/runtime/skills/contribution-observation.test.ts`

## Constraints

- Preserve the unchanged complete `PluginRuntimeProjection.digest`, inactive tombstone, MCP participant requirement, and atomic catalog replacement.
- `SkillHookRuntimeSetRequest` receives `currentProject`; every loaded snapshot must agree, and an empty applied set must retain it.
- Source observation uses a distinct `skills-hooks-snapshot` literal and cannot satisfy `SkillHookContributionObservationSchema` or `composeActivationObservation`.
- Final contribution composition verifies exact scope/plugin/revision/projection/current-project/kind and exact sorted skill ids. Absolute paths never enter schemas or digests.
- Failed/cancelled reconciliation preserves the previous catalog and context.

## Acceptance evidence

- [ ] Fresh empty reconciliation can independently prove exact inactive absence rather than failing as uninitialized.
- [ ] Context disagreement on a non-empty set fails before publication and retains the prior set.
- [ ] Source-only active and inactive evidence is rejected by final lifecycle composition.
- [ ] Matching source/resource evidence creates final `skills-hooks` evidence for non-empty and empty skill slices.
- [ ] Any skill-id, scope, plugin, revision, projection digest, project identity/trust, or active/inactive mismatch fails closed.
- [ ] Existing skill/hook-plus-MCP complete-bundle tests continue to pass through the stricter final observation path.

## Ordering

No sibling dependency. This contract can be implemented in parallel with physical path verification. Resource-set assembly depends on both.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; cohesive contract change across the existing source participant and lifecycle evidence seam.
- Review weight: standard, source: project convention; child checkpoints do not enter review.
- Files changed: `src/runtime/skill-hook/runtime-catalog.ts`, `src/runtime/skill-hook/lifecycle-participant.ts`, `src/application/ports/lifecycle-reload.ts`, `src/runtime/skills/contribution-observation.ts`, and the focused runtime observation tests.
- Tests added/updated: current-project retention on empty reconcile, source-only observation, inactive tombstones, exact resource/source binding, and mismatch rejection.
- Simplification: source snapshot evidence is no longer accepted as final skills-hooks evidence; no second lifecycle state or path authority was introduced.
- Discrepancies from design: the verifier/final participant is composed in the dependent resource-set checkpoint; this story keeps the source participant host-neutral.
- Adjacent issues parked: none.
- Verification: focused Vitest observation suites pass with runtime typechecking disabled because the design branch's pre-existing test typecheck baseline is already non-green under TypeScript 7.
- Stage transition: implementing -> done; implementation commit `implement: epic-skills-hook-runtime-skill-discovery-observation-contract`.
