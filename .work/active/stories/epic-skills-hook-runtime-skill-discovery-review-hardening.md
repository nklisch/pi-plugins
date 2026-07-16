---
id: epic-skills-hook-runtime-skill-discovery-review-hardening
kind: story
stage: implementing
tags: [compatibility, infra, tests]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: [epic-skills-hook-runtime-skill-discovery-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
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
