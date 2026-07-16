---
id: epic-skills-hook-runtime-skill-discovery-observation-contract
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
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
