---
id: epic-skills-hook-runtime-projection-reload-evidence-review-hardening
kind: story
stage: done
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: [epic-skills-hook-runtime-projection-reload-evidence-integration-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
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

- [x] All listed snapshot, participant, and integration negative paths are non-vacuously covered.
- [x] A forged `skills-hooks` base observation without component IDs is rejected by composition.
- [x] Real participant output still composes with one exact MCP contribution for active and inactive expectations.
- [x] Failure/cancellation never partially replaces the catalog or claims whole-bundle activation.
- [x] Full `npm test`, boundaries, build/package import pass with intentional totals/exports.

## Implementation notes
- Execution capability: direct inline implementation at the requested filing commit; one bounded source verifier change and focused evidence tests, with no nested agents or review pass.
- Review weight: standard, caller-directed administrative verification only because the feature's standard review already ran.
- Files changed: `src/application/ports/lifecycle-reload.ts`; `test/runtime/skill-hook/runtime-snapshot.test.ts`; `test/runtime/skill-hook/lifecycle-participant.test.ts`; `test/integration/skill-hook-runtime-projection.test.ts`.
- Tests added: snapshot trust/scope, user-under-untrusted-project, content/data adapter failure, empty slices, and pre-resolution cancellation; participant collision, prior-catalog preservation, pre-swap cancellation, exact mismatch, and project-untrusted rejection; integration strict component evidence, revision/digest non-aliasing, project-context disagreement, two-participant disable, and corrupt-cache fail-closed preservation.
- Simplification: removed the permissive skills/hooks fallback to the base contribution schema; MCP remains on the base schema.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: focused Vitest passed (15 tests); full `npm test` passed with typecheck, dependency boundaries, 128 test files / 674 tests, build, and compiled package import (447 exports).
