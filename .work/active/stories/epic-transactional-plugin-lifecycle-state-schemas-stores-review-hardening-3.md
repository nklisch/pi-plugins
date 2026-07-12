---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening-3
kind: story
stage: done
tags: [tests, infra]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Restore Effective Test Typechecking

## Scope

Make the project's reported Vitest TypeScript verification real and ensure this feature's compile-time mutation guarantees are exercised.

## Required fixes

- Correct `tsconfig.test.json` so test files are inside the configured root and Vitest/TypeScript no longer emits hidden `TS6059` rootDir failures or skips test-side checking.
- Repair every strict test-side type error surfaced by the corrected configuration, including state-contract tests and any pre-existing suite errors required for one globally green test typecheck. Do not weaken production/test compiler strictness, add blanket ignores, or remove meaningful assertions.
- Preserve `@ts-expect-error` mutation boundary checks and prove they suppress real errors; structural/unverified mutations must remain unassignable to `LifecycleStateStore.commit`.
- Correct stale fake-store corruption shapes (`message` versus safe `summary`), branded fixture construction, union narrowing, readonly inputs, and other genuine type-contract mismatches using public schemas/constructors.
- Add an explicit regression that would fail if test files fall outside the typecheck program or an intentionally invalid sentinel is not checked.

## Acceptance criteria

- [x] `npm test` performs real test-file typechecking with no rootDir diagnostics or silently skipped files.
- [x] All production and test TypeScript errors are zero under the corrected configuration.
- [x] Compile-time verified-mutation rejection is actually exercised and remains valid.
- [x] No strictness flags are weakened and no blanket suppressions are introduced.
- [x] Runtime suites, boundaries, build, and exact compiled package import remain green.

## Implementation notes
- Execution capability: inline implementation; the caller explicitly prohibited agents and the work is one cohesive test-contract hardening pass.
- Review weight: standard; caller requested the story advance to review after verification.
- Files changed: `tsconfig.test.json`, strict test fixtures and assertions across the suite, generated-contract type aliases, numeric limit contracts, and `test/typecheck-participation.test.ts`.
- Tests added: the test-program regression checks that `tsconfig.test.json` keeps the repository root and includes `test/**/*.ts`; compile-time sentinels preserve verified-mutation rejection.
- Discrepancies from design: the corrected rootDir exposed pre-existing strict errors throughout the suite, so branded fixtures, safe corruption summaries, exact-optional inputs, union narrowing, and public schema/type alignments were repaired at their actual contracts.
- Adjacent issues parked: none.
- Verification: corrected test typecheck, `npm test`, and the compiled package import all pass.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane verification-pipeline review. Independently confirmed real test-file typechecking, 426 tests, zero production/test type errors, clean dependency boundaries, build, and exact 257-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
