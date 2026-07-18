---
id: gate-tests-production-transition-crash-recovery
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

# Exercise production full-bundle transition crash recovery

## Priority
High

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. Existing production crash coverage kills marketplace acquisition before the lifecycle transition boundary; simpler lifecycle tests do not exercise production subagent and MCP participants.

## Suggested test
Kill a V1→V2 production-bundle update after a prepared transition and before successor proof; separately corrupt candidate projection evidence. Restart and require wholly V1, wholly V2, or explicit recovery-required—never mixed—across skill, ordinary hook, subagent, and MCP observations.

## Test location
`test/e2e/production/failure-recovery-drift.e2e.test.ts`

## Implementation evidence
Added two production-bundle crash regressions. Both wait until the exact prepared journal reference is selected by the current durable state, proving the V1→V2 lifecycle commit boundary was reached before the owner is killed. One restarts from that crash and requires either a fully observed V1/V2 bundle across skill, ordinary hook, subagent, and MCP or explicit recovery-required evidence. The other pauses the owner, corrupts the exact candidate projection payload named by the prepared transition, kills the owner, and requires V1 or explicit recovery-required—never V2 or mixed evidence. SQLite integrity is checked after recovery.

Focused regression: `npx vitest run --config vitest.e2e.config.ts test/e2e/production/failure-recovery-drift.e2e.test.ts` — 5 passed.

## Bounded inline review
Verified the kill condition correlates journal and current-pointer authority rather than relying on time, and the corruption targets the published payload selected by the transition marker. Recovery assertions exercise all production participants through packed Pi/model boundaries and keep explicit recovery-required as the only non-atomic alternative. No material findings.
