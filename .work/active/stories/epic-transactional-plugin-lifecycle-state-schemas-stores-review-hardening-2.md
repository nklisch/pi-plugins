---
id: epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening-2
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-state-schemas-stores
depends_on: [epic-transactional-plugin-lifecycle-state-schemas-stores-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
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

- [ ] `LifecycleStateStore` accepts only opaque verified mutations.
- [ ] No public schema can mint the verified mutation brand without SHA-256 evidence verification.
- [ ] Forged trust/evidence mutation input is rejected by the only public verification factory.
- [ ] Compile-time tests reject passing structural/unverified mutation values to the store.
- [ ] Existing valid mutation, stale-generation, deterministic and scope tests remain green.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
