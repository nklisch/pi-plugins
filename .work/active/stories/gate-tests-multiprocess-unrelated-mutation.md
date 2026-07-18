---
id: gate-tests-multiprocess-unrelated-mutation
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

# Verify unrelated multiprocess mutation progress

## Priority
Medium

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. The promised third-process unrelated mutation is currently only an inspection read, so cross-process unrelated-key progress is not proven.

## Suggested test
Run two competing production-bundle updates while a third process installs or mutates `core-local`; assert the unrelated mutation completes and fresh processes converge on both plugin states with SQLite integrity.

## Test location
`test/e2e/production/concurrency-presentation-security.e2e.test.ts`
