---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening-3
kind: story
stage: implementing
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

- [ ] `npm test` performs real test-file typechecking with no rootDir diagnostics or silently skipped files.
- [ ] All production and test TypeScript errors are zero under the corrected configuration.
- [ ] Compile-time verified-mutation rejection is actually exercised and remains valid.
- [ ] No strictness flags are weakened and no blanket suppressions are introduced.
- [ ] Runtime suites, boundaries, build, and exact compiled package import remain green.
