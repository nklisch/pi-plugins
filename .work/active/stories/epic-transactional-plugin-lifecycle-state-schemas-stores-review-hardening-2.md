---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening-2
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Make Store Mutations Verification-Only

## Scope

Close the remaining public mutation-validation bypass.

## Required fixes

- Separate untrusted structural mutation input from the verified mutation accepted by `LifecycleStateStore`.
- Make the store-facing mutation type opaque/branded and constructible only through `parseStateMutation(input, sha256)` (or an equivalently mandatory verifier factory). Structural schemas may remain internal or be exported only as explicitly unverified input contracts; their inferred type must not satisfy the store-facing verified type.
- Do not publicly export a verified mutation schema whose `.parse()` can mint the brand without canonical evidence checks.
- Update mutation results/ports/fakes/callers so compile-time types require verified mutations and runtime parsing always verifies trust subjects, installed evidence fingerprints, logical references, content evidence, scope, and generation.
- Add runtime and compile-time regressions demonstrating forged evidence can pass structural shape parsing only as unverified input but cannot reach the store or become a verified mutation without rejection.

## Acceptance criteria

- [x] `LifecycleStateStore` accepts only opaque verified mutations.
- [x] No public schema can mint the verified mutation brand without SHA-256 evidence verification.
- [x] Forged trust/evidence mutation input is rejected by the only public verification factory.
- [x] Compile-time tests reject passing structural/unverified mutation values to the store.
- [x] Existing valid mutation, stale-generation, deterministic and scope tests remain green.
- [x] Full `npm test`, build, boundaries, and exact compiled package import pass.

## Implementation notes
- Execution capability: direct-read inline implementation; the mutation contract and its fake-store tests are one cohesive application boundary, and the caller explicitly prohibited agents.
- Review weight: standard by project default; implementation stops at the requested `stage: review` boundary.
- Files changed: `src/application/state-contract.ts`, `src/application/ports/lifecycle-state-store.ts`, `src/index.ts`, `test/application/state-contract.test.ts`, `test/application/state-contract-types.test.ts`, `test/integration/state-contracts.test.ts`, `test/public-api.test.ts`, `test/compiled-package-import.mjs`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`.
- Tests added: runtime structural-versus-verified and forged-trust regressions; compile-time store-port rejection of `UnverifiedStateMutation`; fake-store runtime rejection of structural values.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Verification: `npm test` passes (425 tests, typecheck, boundaries, build, and compiled package import); independent `npm run build && node test/compiled-package-import.mjs` also passes.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane verified-mutation review. Independently confirmed 425 tests, clean typecheck and dependency boundaries, build, and exact 257-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
