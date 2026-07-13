---
id: epic-transactional-plugin-lifecycle-immutable-stores-promotion-review-hardening-2
kind: story
stage: implementing
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

- [ ] Swapping any configured parent with a symlink/different inode cannot redirect writes, publication, cleanup, or chmod outside the host root.
- [ ] Parent identities are nofollow-validated at each effect boundary and after relevant async gaps.
- [ ] Valid unchanged parents preserve existing promotion/runtime behavior.
- [ ] Projection metadata scope, plugin, digest, and derived ref are mutually bound on every inspection/idempotency path.
- [ ] Exact plugin-store, data-root, staging/projection parent-swap and metadata-tamper reproducers pass fail-closed without foreign mutation.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
