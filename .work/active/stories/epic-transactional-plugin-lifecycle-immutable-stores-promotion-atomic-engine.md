---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-atomic-engine
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-staging]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Promote immutable content atomically and durably

## Scope

Implement Unit 3 of the parent design. Add the platform primitive boundary and one promotion engine for marketplace/plugin content. It owns final bounded rewalk, source/content rebinding, read-only sealing, file/directory durability, marker-gated visibility, no-replace publication, idempotent deduplication, and collision refusal. Do not mutate selected/active state or clean arbitrary abandoned roots.

## Required files

- `src/application/ports/content-store-platform.ts`
- `src/infrastructure/filesystem/immutable-content-store.ts`
- `src/infrastructure/filesystem/content-store-durability.ts`
- matching infrastructure tests

## Design constraints

- Require an opaque verified plan and live owned allocation; exact handoff root is `<slot>/content`, with no `.work` remainder.
- Reuse the existing bounded disk verifier and compare every manifest entry, not only root digest/metadata.
- Recompute binding and store key from rewalked content.
- Prepare one unique sibling, seal files `0444/0555` and directories `0555`, sync files/directories bottom-up, publish a synced `READY` marker, then use atomic no-replace directory publication and sync the final parent.
- Production success requires probed no-replace, file fsync, directory fsync, and reliable POSIX-style mode enforcement. Unsupported platforms fail explicitly.
- Existing target is `already-present` only after strict metadata, permissions, and complete rewalk match. Mismatch is collision; never overwrite/merge/repair in place.
- Preserve the distinction between pre-publication cancellation and post-publication indeterminate durability.

## Acceptance criteria

- [ ] Every post-handoff tree mutation is caught before publication.
- [ ] Fault injection after every preparation/seal/sync/marker/rename step exposes only absent or complete ready revisions.
- [ ] Concurrent identical promotions converge safely; differing requests for one key preserve the winner and return collision.
- [ ] Matching ready content is retry-safe only after full rewalk.
- [ ] No `promoted` result is returned before final-parent sync or with downgraded durability/read-only guarantees.
- [ ] Published roots expose no mutation API and preserve executable-bit semantics.
- [x] Unit tests, typecheck, and boundaries pass.

## Implementation notes
- Execution capability: direct host implementation; the promotion engine was kept serialized with its staging dependency because publication, durability, and ownership form one write boundary.
- Review weight: standard, with review intentionally left to the caller because agents were prohibited.
- Files changed: `src/application/ports/content-store-platform.ts`, `src/infrastructure/filesystem/content-store-durability.ts`, `src/infrastructure/filesystem/immutable-content-store.ts`, and focused atomic/durability tests.
- Tests added: `test/infrastructure/filesystem/immutable-content-store.test.ts`, `test/infrastructure/filesystem/content-store-durability.test.ts`.
- Discrepancies from design: Node's stock API cannot prove atomic no-replace directory publication, so the production platform refuses capability probing unless a platform-specific primitive is injected; the unsafe check-then-rename helper is test-only and is not composition or package API.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`, `npm run boundaries`, and focused promotion/durability Vitest suites pass.

## Review (2026-07-13)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 503 tests, real production/test typechecking, clean dependency boundaries, build, and exact 319-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
