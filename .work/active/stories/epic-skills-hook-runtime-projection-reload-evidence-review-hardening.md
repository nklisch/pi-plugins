---
id: epic-skills-hook-runtime-projection-reload-evidence-review-hardening
kind: story
stage: implementing
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: [epic-skills-hook-runtime-projection-reload-evidence-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Close projection trust, atomicity, and exact-evidence gaps

## Standard-review fix set

The feature's one independent pass approved the runtime contracts but found missing negative evidence and one permissive pure-verifier path. Implement exactly:

1. Snapshot tests for project identity/key/root mismatch, project trust denial, user scope remaining loadable while current project is untrusted, content/data adapter failures, valid empty skill/hook slices, and cancellation before publication/resolution side effects.
2. Participant tests for target collision, snapshot failure preserving the previously published catalog, pre-swap abort, exact wrong scope/plugin/revision/projection mismatch, and project-untrusted observation.
3. Integration tests for revision update not aliasing the prior catalog/evidence, disable requiring both skills-hooks and MCP independently inactive, user/project isolation/current-project changes, and corrupt cache fail-closed without replacing visible catalog.
4. In `composeRuntimeObservation`, when `participant === "skills-hooks"`, require `SkillHookContributionObservationSchema` directly. Never accept a base contribution lacking exact `skillComponentIds` and `hookComponentIds`. Keep MCP on its own base contribution schema.

## Constraints

- Do not broaden production behavior beyond closing the verifier hole; no new runtime protocol, state, cache, reload authority, path logic, or UI.
- Preserve exact projection/payload digest separation, root-port resolution, atomic catalog swap, active/inactive semantics, mandatory MCP composition, lifecycle rollback/recovery ownership, and public API.
- Tests assert behavior, not implementation details; no weakening or fake-only success.
- Optional catalog self-defense, canonical JSON comparison, and cleanup-signal style are explicitly out of scope.
- Standard review already ran; after implementation, host performs administrative verification only.

## Acceptance evidence

- [ ] All listed snapshot, participant, and integration negative paths are non-vacuously covered.
- [ ] A forged `skills-hooks` base observation without component IDs is rejected by composition.
- [ ] Real participant output still composes with one exact MCP contribution for active and inactive expectations.
- [ ] Failure/cancellation never partially replaces the catalog or claims whole-bundle activation.
- [ ] Full `npm test`, boundaries, build/package import pass with intentional totals/exports.
