---
id: gate-tests-production-transition-crash-recovery
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

# Exercise production full-bundle transition crash recovery

## Priority
High

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. Existing production crash coverage kills marketplace acquisition before the lifecycle transition boundary; simpler lifecycle tests do not exercise production subagent and MCP participants.

## Suggested test
Kill a V1→V2 production-bundle update after a prepared transition and before successor proof; separately corrupt candidate projection evidence. Restart and require wholly V1, wholly V2, or explicit recovery-required—never mixed—across skill, ordinary hook, subagent, and MCP observations.

## Test location
`test/e2e/production/failure-recovery-drift.e2e.test.ts`
