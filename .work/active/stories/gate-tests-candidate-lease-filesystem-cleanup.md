---
id: gate-tests-candidate-lease-filesystem-cleanup
kind: story
stage: drafting
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

## Suggested test
Compose the candidate lease with the real staging allocator, materialize executable bytes, and verify the root is removed after success, callback failure, and cancellation. Verify claimed content survives only until lifecycle transfer.

## Test location
`test/composition/candidate-content-lease.test.ts`
