---
id: gate-tests-multiprocess-unrelated-mutation
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

# Verify unrelated multiprocess mutation progress

## Priority
Medium

## Value evidence
Item: `epic-native-plugin-management-production-runtime-acceptance`. The promised third-process unrelated mutation is currently only an inspection read, so cross-process unrelated-key progress is not proven.

## Acceptance
- Two packed Pi processes contend on the production-bundle V1→V2 update while a third packed process performs a real lifecycle mutation of the unrelated `core-local` plugin.
- The unrelated mutation returns exact committed recovery-required evidence rather than serving as an inspection-only observer; one production update succeeds and its peer returns one of the exact target/configuration contention outcomes.
- After all owners exit, fresh processes independently converge on production-bundle V2 and the unrelated plugin's disabled state, and every SQLite authority database passes integrity checks.
- Coordination uses real operation completion and process shutdown boundaries and cleans up all processes.

## Test location
`test/e2e/production/concurrency-presentation-security.e2e.test.ts`

## Implementation evidence
Installed `core-local` as an enabled baseline, then ran two production-bundle updates concurrently with a third packed process performing a real `disable core-local` lifecycle mutation. The third process must return committed `PENDING_TRANSITION` recovery evidence; the update pair is constrained to one exact success and one exact target/configuration contention result. Two fresh processes then agree on production V2, `core-local` disabled/inactive with no pending transition, and absence of its skill command. All SQLite databases pass integrity checks.

Focused regression: `npx vitest run --config vitest.e2e.config.ts test/e2e/production/concurrency-presentation-security.e2e.test.ts` — 4 passed; the contention case also passed two additional focused runs.

## Bounded inline review
Verified the third participant mutates plugin authority rather than reading it, exact envelope tuples replace broad status matching, and fresh processes prove both keys converge before SQLite integrity checks. The explicit committed recovery-required response is treated as an intermediate public outcome, not as completion without fresh proof. No material findings.
