---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-hardening
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-atomic-engine, epic-transactional-plugin-lifecycle-immutable-stores-promotion-runtime-roots]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden content-store integration and public contracts

## Scope

Implement Unit 5 of the parent design. Wire the Node content store beside existing materializers, expose only lifecycle-facing contracts, run adversarial real-filesystem integration coverage, enforce architectural boundaries, and roll foundation docs forward. Do not implement lifecycle operations, active-state changes, trust, recovery/GC, projection generation, or runtime activation.

## Required files

- `src/infrastructure/source/create-source-materializers.ts`
- `src/infrastructure/filesystem/create-content-store.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- integration/public/package/boundary tests
- `docs/ARCHITECTURE.md` (plus `SPEC`/`COMPATIBILITY` only if assertions changed)

## Design constraints

- Production composition binds one canonical host root, private crypto/randomness, platform capability probe, source materializers, verifier, and content store without exporting internals.
- Public package surface includes schemas/types/application service/port/result/factory only; allocation minting, tokens, raw layouts, rename/fsync/chmod primitives, metadata format, deletion, and immutable writers remain internal.
- Integration uses real local Git, marketplace-relative, Git-subdir, and npm handoffs and validates restart through state evidence.
- Dependency rules keep domain/application independent from Node/infrastructure and prevent consumers bypassing the port.
- Roll docs in place: ready-marker publication, state-selected marketplace snapshot (no store pointer), stable external data, separate generated roots, and honest platform support.

## Acceptance criteria

- [ ] Real materializers use store allocations and promote without receiving immutable/data/generated destination paths.
- [ ] Restart resolution works from validated logical state evidence; no physical path is persisted.
- [ ] Integration covers concurrency, crash points, retries, collisions, cancellation, tampering, symlink/inode swaps, durability/read-only failures, data continuity, and projection replacement.
- [ ] Exact source/compiled export allowlists contain no low-level or out-of-scope API.
- [ ] Dependency-cruiser and canary tests prevent inward layers from importing adapters and consumers from importing filesystem internals.
- [ ] Foundation docs describe current/imminent truth without migration-history prose or overstated guarantees.
- [ ] Full `npm test` passes.
