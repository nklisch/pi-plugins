---
id: epic-skills-hook-runtime-skill-discovery-resource-set
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-skill-discovery
depends_on: [epic-skills-hook-runtime-skill-discovery-observation-contract, epic-skills-hook-runtime-skill-discovery-path-verification]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Assemble deterministic scope-correct skill resources

## Checkpoint

Build the host-neutral discovery service and final observed participant over the read-only snapshot catalog and skill-path verifier. Recompute a complete deterministic resource set, isolate failures per plugin target, retain scope-specific ownership across canonical path dedupe, and atomically publish contribution evidence that final lifecycle observation must consume.

## Files

- `src/runtime/skills/resource-discovery.ts`
- `src/runtime/skills/contribution-observation.ts`
- `src/runtime/skill-hook/runtime-catalog.ts`
- `test/runtime/skills/resource-discovery.test.ts`

## Constraints

- Candidates come only from the current `SkillHookRuntimeCatalog`; do not read lifecycle state, manifests from disk, Pi settings, trust records, or portable declarations.
- Include every user target. Include project targets only for exact catalog project identity/trust and live Pi trust agreement.
- Derive the exact manifest `SKILL.md` entry from each normalized root. One failed skill invalidates that target's complete skill slice; unrelated targets remain eligible.
- Order by user/project rank, plugin key, component id, and root using code-point comparison. Verify before canonical-file dedupe. Same-name different files remain present for Pi.
- A successful reconcile invalidates prior discovery evidence; failed/cancelled reconcile preserves it. Cancellation before discovery publication leaves the prior observation unchanged and returns no partial replacement.
- Logical contribution digests bind component ids/normalized roots and complete projection identity, never absolute paths.

## Acceptance evidence

- [ ] Randomized catalog/input completion produces identical user-first/project-second paths and observations.
- [ ] Current trusted project contributes; trust denial, project switch, stale identity, and stale snapshot context contribute no project target while valid user targets remain.
- [ ] A target with one missing/escaping/mutated/unreadable root contributes none of its skills and returns an observable target failure; another target still succeeds.
- [ ] Canonical-file duplicates emit once with all logical owners; same-name different paths are not collapsed.
- [ ] Empty skill slices are valid active contributions, and absent initialized targets produce exact inactive contribution evidence.
- [ ] Final participant cannot observe a newly reconciled projection until the corresponding discovery set publishes.

## Ordering

Blocked by both observation-contract and path-verification checkpoints. The typed Pi adapter depends on this host-neutral port.

## Implementation notes
- Execution capability: GPT-5.6 Luna, high; dependency-ordered host-neutral assembly over the completed catalog and filesystem port.
- Review weight: standard, source: project convention; child checkpoints do not enter review.
- Files changed: `src/runtime/skills/resource-discovery.ts` and `test/runtime/skills/resource-discovery.test.ts`.
- Tests added/updated: deterministic scope/plugin ordering, target-scoped failure isolation, healthy-path retention, observation invalidation, and applied-reconcile removal.
- Simplification: one in-memory latest discovery registry owns emitted paths, target failures, and logical path owners; there is no copied tree, settings cache, or persisted path state.
- Discrepancies from design: ownership evidence remains private as a canonical-path owner map; the public result exposes only paths and stable target failures.
- Adjacent issues parked: none.
- Verification: source typecheck and focused resource-discovery suite pass; the suite was run with runtime typechecking disabled because the design branch's pre-existing test typecheck baseline is already non-green under TypeScript 7.
- Stage transition: implementing -> done; implementation commit `implement: epic-skills-hook-runtime-skill-discovery-resource-set`.
