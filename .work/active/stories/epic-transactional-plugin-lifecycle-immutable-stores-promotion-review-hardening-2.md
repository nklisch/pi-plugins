---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-review-hardening-2
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-immutable-stores-promotion
depends_on: [epic-transactional-plugin-lifecycle-immutable-stores-promotion-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Bind Store Parents and Projection Metadata

## Scope

Close the blocker and important finding from phase-2 adversarial immutable-store review.

## Required fixes

### Persistent root ownership

Layout bootstrap must retain canonical realpath/device/inode identities for the host root and every effectful store/runtime parent. Before allocation, promotion, resolution, cleanup, permission changes, data-root creation, or projection publication, revalidate the complete nofollow ancestor chain and exact parent identity. Renaming a configured root and replacing it with a symlink or different inode must fail closed before any foreign-tree mutation. Avoid path-only authority; operations consume a verified root capability/identity.

Cover plugin store, marketplace store, staging, prepared roots, persistent data, and projection roots. Revalidation must be immediate at the effect boundary and repeated after asynchronous gaps where a swap is possible.

### Projection identity binding

During projection inspection, existing-target idempotency, and race-loser verification, recompute `ProjectionRootRef` from exact `{scope, plugin, projectionDigest}` and verify it equals metadata. Compare every identity-defining metadata field, not only the stored ref/digest. Tampered scope or plugin with an unchanged reference must fail.

## Acceptance criteria

- [x] Swapping any configured parent with a symlink/different inode cannot redirect writes, publication, cleanup, or chmod outside the host root.
- [x] Parent identities are nofollow-validated at each effect boundary and after relevant async gaps.
- [x] Valid unchanged parents preserve existing promotion/runtime behavior.
- [x] Projection metadata scope, plugin, digest, and derived ref are mutually bound on every inspection/idempotency path.
- [x] Exact plugin-store, data-root, staging/projection parent-swap and metadata-tamper reproducers pass fail-closed without foreign mutation.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation summary

- Added persistent no-follow root capabilities retaining every ancestor realpath/device/inode identity for host, staging, marketplace/plugin stores, data, generated, and projection roots.
- Revalidated those capabilities and allocation/prepared identities immediately before filesystem/platform effects, after asynchronous verification/sync gaps, and before cleanup; parent swaps and symlink substitutions fail closed without foreign-tree mutation.
- Rebound projection metadata by recomputing `ProjectionRootRef` from exact scope/plugin/digest and comparing all identity fields during inspection, idempotency, and publication-race loser verification.
- Added exact staging, plugin-store, marketplace-store, prepared-root, data-parent, projection-parent, and projection metadata tamper reproducers.
- Verification: `npm test`, build, boundaries, and compiled package import pass.

## Review (2026-07-13)

**Verdict**: Approve

**Review notes**: Substrate mode; caller's explicit story fast-advance policy; independent full-suite verification. Confirmed all parent-swap and projection-metadata acceptance criteria through 548 tests, strict production/test typechecking, clean boundaries, build, and exact 319-export package import. No blockers, important findings, or nits.
