---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-runtime-roots
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Resolve content and separate data and projection roots

## Scope

Implement Unit 4 of the parent design. Resolve immutable marketplace/plugin roots from validated state evidence, create stable writable persistent-data roots, and allocate/seal replaceable generated projection roots. Keep every root physically and logically separate. Do not generate projection contents, select active marketplace/plugin/projection state, delete data, or perform retention/GC.

## Required files

- `src/infrastructure/filesystem/content-root-resolver.ts`
- `src/infrastructure/filesystem/runtime-root-store.ts`
- matching infrastructure tests

## Design constraints

- Resolve content from verified `MarketplaceSnapshotRecord` / `InstalledRevisionRecord` evidence, never a caller path or decoded logical ref alone.
- Require valid metadata + `READY`; rewalk before first process use and reject changed/unready/wrong-kind roots.
- `ensureDataRoot` verifies stable scope/plugin `PluginDataRef`, creates private writable `0700`, and exposes no delete/reset API.
- Projection roots use scope/plugin/digest `ProjectionRootRef`, a private prepared root, digest verification, read-only sealing, durability, and ready publication.
- User/project roots cannot alias. Data remains stable across revisions; content and projection remain immutable and distinct.
- Do not create a filesystem marketplace `current` pointer; selected state remains authoritative.

## Acceptance criteria

- [ ] Valid state evidence resolves exact ready content; missing, tampered, colliding, unready, or wrong-kind roots fail.
- [ ] Two revisions resolve distinct content and the same data root for one scope/plugin.
- [ ] User/project and different-plugin data roots never alias.
- [ ] Data is private/writable and has no removal API; projection is invisible before seal and immutable afterward.
- [ ] Generated roots are replaceable caches and no absolute path is persisted into state.
- [x] Tests, typecheck, and boundaries pass.

## Implementation notes
- Execution capability: direct host implementation; resolver, stable data, and projection publication share the same layout and durability boundary.
- Review weight: standard, with review intentionally left to the caller because agents were prohibited.
- Files changed: `src/infrastructure/filesystem/content-root-resolver.ts`, `src/infrastructure/filesystem/runtime-root-store.ts`, `src/domain/content-store.ts`, and focused runtime/resolver tests.
- Tests added: `test/infrastructure/filesystem/runtime-root-store.test.ts`, `test/infrastructure/filesystem/content-root-resolver.test.ts`.
- Discrepancies from design: projection payloads use a deterministic injected-SHA-256 tree digest helper because projections do not have source manifests; publication metadata and `READY` are excluded from that payload digest and remain marker-gated.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, and focused runtime-root/resolver Vitest suites pass.

## Review (2026-07-13)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 503 tests, real production/test typechecking, clean dependency boundaries, build, and exact 319-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
