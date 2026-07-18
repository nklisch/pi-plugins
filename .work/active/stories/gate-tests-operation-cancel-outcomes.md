---
id: gate-tests-operation-cancel-outcomes
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

# Verify public operation cancellation outcomes

## Priority
Medium

## Value evidence
Item: `epic-native-plugin-management-deterministic-control-facade`. `operation cancel` has production dispatch but only grammar coverage; accepted, missing, and post-commit owner truth are unproven.

## Suggested test
Stall a real lifecycle operation before commit, cancel via another packed RPC process, and assert accepted cancellation with unchanged authority. Add missing and post-possible-commit cases proving cancellation cannot overwrite committed or recovery-required truth.

## Test location
`test/e2e/failure/output-cancellation-reload.e2e.test.ts`
