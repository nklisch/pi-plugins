---
id: gate-tests-candidate-lease-filesystem-cleanup
kind: story
stage: done
tags: [testing]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: tests
created: 2026-07-18
updated: 2026-07-18
---

# Restore real-filesystem candidate lease cleanup regression

## Priority
Medium

## Value evidence
Item: `epic-native-plugin-management-trusted-installation-candidate-lease-disclosure`. A refactor removed the real staging allocator regression that proved candidate roots are physically deleted; current tests mock paths and discard.

## Acceptance
- The candidate-content lease is composed with the real content-store layout and staging allocator, and its materializer writes executable bytes into the allocated root.
- `withMaterialized` physically removes the allocation and owner sidecar after callback success, callback failure, and caller cancellation.
- A claimed lease keeps its materialized bytes alive across release because ownership transferred; the real lifecycle/content-store transfer then consumes the exact allocation and removes staging bytes.
- Assertions inspect filesystem existence and transferred content, not mocked allocator calls or opaque harness state.

## Test location
`test/composition/candidate-content-lease.test.ts`

## Implementation evidence
Composed the lease with the production Node content store and real staging allocator. The materializer writes an executable file and a verified manifest. Success, callback failure, and cancellation now prove both the allocation and owner sidecar disappear from the filesystem. The claim path proves bytes remain after lease release, then uses the real content-store promotion boundary to transfer the allocation and remove staging.

Focused regression: `npx vitest run test/composition/candidate-content-lease.test.ts` — 7 passed.

## Bounded inline review
Verified the new cases observe filesystem bytes, published content, and path removal rather than allocator mock calls. Cleanup covers sealed read-only content without weakening the production contract. No material findings.
