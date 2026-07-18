---
id: epic-skills-hook-runtime-projection-reload-evidence-contribution-observation
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-skills-hook-runtime-projection-reload-evidence
depends_on: [epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Compose Skill and Hook Reload Contribution Evidence

## Checkpoint

Implement Unit 3 of the parent design: an atomically replaced, process-local skill/hook snapshot catalog; separate read-only and reconcile capabilities; independently observed active/inactive skill/hook evidence; and the common composition verifier that requires matching MCP evidence before a `LifecycleReloadPort` observation can exist.

The catalog is a derived runtime view, not authoritative state. Do not persist it, create per-component switches/pointers, implement `ctx.reload()`, or export a complete reload adapter. Reconcile success is operational only and never activation proof.

## Files

- `src/runtime/skill-hook/runtime-catalog.ts`
- `src/runtime/skill-hook/lifecycle-participant.ts`
- `src/application/ports/lifecycle-reload.ts`
- `src/application/recovery-contract.ts`
- `src/application/plugin-lifecycle-service.ts` only for stricter inactive evidence consumption
- focused runtime and lifecycle tests named in the parent

## Required behavior

- Build and verify a full temporary catalog, reject duplicate scope/plugin targets, then perform one synchronous swap after the final abort check.
- Preserve same-name skills across plugins; never resolve Pi skill collisions in this feature.
- Refuse observation before one complete catalog initialization.
- Emit active evidence with exact scope/plugin/revision/complete digest, current project context, component ids, and deterministic slice digest.
- Emit inactive evidence only for exact absence plus the canonical tombstone digest and current project context.
- Require exactly one `skills-hooks` and one `mcp` contribution with identical expected binding before composing active or inactive lifecycle observation.
- Add inactive `projectionDigest` and current-project context to lifecycle observation and update recovery/lifecycle matching accordingly.

## Acceptance evidence

- [ ] Failed/cancelled reconciliation leaves the previous complete catalog untouched; read-only consumers cannot mutate it.
- [ ] Active and inactive observation reject stale/wrong scope, plugin, revision, digest, target, project identity, or trust evidence.
- [ ] Missing, duplicate, or disagreeing skill/hook/MCP contributions cannot satisfy lifecycle observation.
- [ ] Empty component slices still require two exact independently observed contributions.
- [ ] `reload()` acceptance and reconcile return values are absent from evidence-composition inputs.
- [ ] Lifecycle rollback/recovery tests pass with exact inactive tombstone digest comparison.

## Ordering

Blocked by `epic-skills-hook-runtime-projection-reload-evidence-snapshot-resolution`; exact snapshots are the only values the catalog may install or observe.

## Implementation notes
- Execution capability: GPT-5.6 Luna xhigh; catalog replacement, contribution composition, and lifecycle comparison were implemented as one boundary because evidence integrity spans all three.
- Review weight: standard, from project convention; this child checkpoint is verified directly and does not enter review.
- Files changed: `src/runtime/skill-hook/runtime-catalog.ts`, `src/runtime/skill-hook/lifecycle-participant.ts`, `src/application/ports/lifecycle-reload.ts`, `src/application/ports/project-trust.ts`, `src/application/recovery-contract.ts`, `src/application/plugin-lifecycle-service.ts`, plus focused lifecycle/integration fixtures.
- Tests added/updated: atomic catalog active/inactive observation, two-participant active/inactive composition, and existing lifecycle/recovery evidence fixtures; focused suites passed (3 files / 8 tests).
- Simplification: one common contribution-binding schema and pure composition verifier serve both participant slices; no reload invocation, MCP interpreter, state reader, or persistent catalog was added.
- Discrepancies from design: current-project context is defined in the application project-trust port and re-exported by the runtime snapshot module so application ports remain independent of runtime adapters.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; focused lifecycle, participant, composition, and integration suites passed.
