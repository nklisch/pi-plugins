---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-staging
kind: story
stage: implementing
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

# Allocate and protect caller-private staging

## Scope

Implement Unit 2 of the parent design. Build the strict host-root layout codec and Node staging allocator used by `ContentStorePort`. It must allocate empty private slots accepted by current materializers while retaining process-private token/path/inode ownership for promotion and cleanup. Do not implement content publication, state mutation, crash-age cleanup, or GC.

## Required files

- `src/infrastructure/filesystem/content-store-layout.ts`
- `src/infrastructure/filesystem/staging-allocator.ts`
- matching infrastructure tests

## Design constraints

- Layout accepts only branded store/reference values and emits digest-only lowercase segments.
- Host root is adapter-supplied, absolute, canonical, and walked with no-follow checks; no OS temp directory or materializer-chosen path.
- Allocate 128-bit cryptographic random ids with exclusive `mkdir(0700)` under `staging/v1`.
- Track allocation token, canonical root, parent, device, and inode privately. Validate all before promotion eligibility or removal.
- Return only the `StagingSlot` view to materializers.
- `discardStaging` is retry-safe for verified absence but never recursively removes an unowned/replaced path.
- Safe errors redact absolute paths, tokens, native messages, and source details.

## Acceptance criteria

- [ ] Every slot is new, empty, real, private, under the canonical staging parent, and works with existing source materializers.
- [ ] Relative/symlink/non-directory/weak-permission roots and pre-existing allocation leaves fail closed.
- [ ] Forged capabilities, token/root swaps, inode/device replacement, and foreign paths cannot be promoted or removed.
- [ ] Cancellation before completion leaves no slot; explicit discard is idempotent and reports cleanup failure honestly.
- [ ] Tests prove materializers receive no immutable/data/generated destination information.
- [ ] Infrastructure tests, typecheck, and dependency boundaries pass.
