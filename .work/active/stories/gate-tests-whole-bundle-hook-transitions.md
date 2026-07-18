---
id: gate-tests-whole-bundle-hook-transitions
kind: story
stage: implementing
tags: [testing]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: tests
created: 2026-07-18
updated: 2026-07-18
---

# Verify ordinary-hook removal and restoration

## Priority
High

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. Whole-bundle lifecycle explicitly includes ordinary hooks, but inactive observations currently assert nothing and active checks can accept historical markers.

## Suggested test
Record hook-log count; disable and start a fresh Pi session with no new SessionStart record; re-enable and require exactly one V1 record; repeat after V2 update and uninstall.

## Test location
`test/e2e/production/golden-full-bundle.e2e.test.ts`
