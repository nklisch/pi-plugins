---
id: gate-tests-whole-bundle-hook-transitions
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

# Verify ordinary-hook removal and restoration

## Priority
High

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. Whole-bundle lifecycle explicitly includes ordinary hooks, but inactive observations currently assert nothing and active checks can accept historical markers.

## Suggested test
Record hook-log count; disable and start a fresh Pi session with no new SessionStart record; re-enable and require exactly one V1 record; repeat after V2 update and uninstall.

## Test location
`test/e2e/production/golden-full-bundle.e2e.test.ts`

## Implementation evidence
Added a durable production-hook evidence reader and changed the golden lifecycle to use a fresh packed Pi session at every hook boundary. Each active restart requires exactly one new `SessionStart` record for the expected V1 or V2 revision; disabled and uninstalled restarts require an empty log delta after a completed packed startup/status barrier. Enable proves exact V1 restoration, update proves exact V2 replacement, and uninstall proves removal without accepting historical markers.

Focused regression: `npx vitest run --config vitest.e2e.config.ts test/e2e/production/golden-full-bundle.e2e.test.ts` — 1 passed.

## Bounded inline review
Checked that every hook assertion is tied to a fresh process and durable log delta while skill, subagent, and MCP observations remain on the production boundary. No inactive branch is assertion-free and no historical V1/V2 marker can satisfy a fresh transition. No material findings.
