---
id: epic-skills-hook-runtime-skill-discovery-review-hardening
kind: story
stage: done
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: [epic-skills-hook-runtime-skill-discovery-integration-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Remove dead registry ownership and prove trust/dedup paths

## Standard-review fix set

1. Remove `ResourceOwner`, `ownersByPath`, `DiscoveryRegistry.owners`, unused `TargetEvidence.paths`, `EMPTY_SKILLS`, and the dead local `abortError`. Keep one atomic complete registry replacement; do not introduce partial-update semantics.
2. Add project trust denial evidence: one user and one matching project target, `projectTrusted: false`, user path remains, project failure is `PROJECT_UNTRUSTED`, project observation is `RESOURCE_UNAVAILABLE`.
3. Add project identity mismatch evidence with `PROJECT_IDENTITY_MISMATCH` while unrelated user resources remain available.
4. Exercise real canonical-path dedup by making two logical targets resolve to one canonical file. Assert one Pi path and ready exact observation for each logical target. Rename/adjust the existing misleading test as needed.

## Constraints

No path verification, Pi collision authority, ordering, failure isolation, observation contract, project trust semantics, public API, state, settings, copying, or cancellation behavior changes beyond removing unreachable bookkeeping. Keep public observation result types. Do not fold close-error/style/story-note cleanup into this story. Standard review already ran; no second pass.

## Acceptance evidence

- [ ] No source reference remains to removed ownership/path/dead-helper structures.
- [ ] User paths survive both project trust and identity failures.
- [ ] Failed project targets cannot produce ready final observation.
- [ ] Same canonical file emits once while both logical targets observe ready.
- [ ] Focused and full `npm test`, boundaries, build/package import pass.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; direct inline implementation matched the bounded source/test cleanup and no nested agents or review delegation were requested.
- Review weight: standard by project convention; the caller explicitly prohibited a second pass after the existing standard review.
- Files changed: `src/runtime/skills/resource-discovery.ts` and `test/runtime/skills/resource-discovery.test.ts`.
- Tests added/removed: Added project trust-denial, project identity-mismatch, and same-canonical-file dual-observation coverage; no tests removed.
- Simplification: Removed only the dead registry owner map/records, target path retention, `EMPTY_SKILLS`, and local `abortError`; complete registry replacement remains atomic.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: Focused resource-discovery suite passed (5 tests); full `npm test` passed with 138 files and 713 tests, including typecheck, boundaries, build, and compiled package import.
- Stage transition: implementing -> done; feature remains eligible for review.
