---
id: epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: [epic-skills-hook-runtime-projection-reload-evidence-cache-contract]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Resolve Exact Skill and Hook Runtime Snapshots

## Checkpoint

Implement Unit 2 of the parent design. Consume a verified complete cache value plus the exact `InstalledRevisionRecord` supplied by native composition, acquire current project identity/trust through the existing ports, resolve immutable plugin content and stable data only through `ContentStorePort`, and produce one deterministic skill/hook snapshot.

Do not read `LifecycleStateStore`, transition storage, manifests, credentials, or raw store layout. Do not derive absolute paths from refs or join skill roots here. Preserve the complete projection for sibling MCP composition while narrowing only the skill/hook snapshot.

## Files

- `src/runtime/skill-hook/runtime-snapshot.ts`
- existing project-root, project-trust, and content-store port types only as required by the parent contract
- `test/runtime/skill-hook/runtime-snapshot.test.ts`

## Required behavior

- Cross-check scope, plugin, revision, projection digest/ref, content ref, data ref, and optional configuration ref before root resolution.
- Acquire/verify one current `ProjectIdentity`/`ProjectKey` and current Pi trust assessment for the snapshot set.
- Reject a project projection for a different current project or an untrusted project; retain current identity/trust explicitly for user scope without applying the project activation gate to it.
- Preserve all normalized skill/hook components in deterministic order and derive a logical contribution digest that excludes physical roots.
- Return typed ready/failed/cancelled results with no partial snapshot or unsafe diagnostic payload.

## Acceptance evidence

- [ ] Wrong revision/reference/scope/plugin/configuration evidence fails before roots are exposed.
- [ ] Content and data roots are exact adapter outputs; runtime code has no state import, store-path codec, manifest reread, or relative-root path construction.
- [ ] User/project copies remain isolated and physical host-root changes do not alter the logical contribution digest.
- [ ] Project identity mismatch/trust revocation fail closed while user scope records the same current context explicitly.
- [ ] Empty skill/hook slices are valid and remain bound to the complete digest containing MCP.
- [ ] Failure and cancellation tests preserve no partial snapshot and redact paths/native causes.

## Ordering

Blocked by `epic-skills-hook-runtime-projection-reload-evidence-cache-contract`; it requires the verified cache reader and corrected generated-root evidence.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh; the snapshot loader remains in the same feature-owner context as the cache contract so logical cache evidence and post-commit root handoff cannot drift.
- Review weight: standard, from project convention; this child checkpoint is verified directly and does not enter review.
- Files changed: `src/runtime/skill-hook/runtime-snapshot.ts`, `test/runtime/skill-hook/runtime-snapshot.test.ts`.
- Tests added/updated: adapter-root resolution, stable contribution digest across physical roots, and pre-resolution revision mismatch coverage (2 tests passed).
- Simplification: current project identity/trust is acquired once through the existing authority and trust ports; no state reader, manifest reader, path codec, or second root resolver was added.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; focused Vitest snapshot suite — 1 file / 2 tests passed.
