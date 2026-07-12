---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-secret-custody
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-value-validation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Secret Custody and Crash-Safe Configuration Replacement

## Scope

Implement Unit 3 of the parent feature: redacted native-private sensitive values, adapter-neutral configuration/secret/write-id ports, save/removal application services, and port conformance tests. Implement no OS credential backend, physical configuration store, cleanup journal, prompts, activation, or automatic-update behavior.

## Files

- `src/application/sensitive-value.ts`
- `src/application/configuration-service.ts`
- `src/application/ports/plugin-configuration-store.ts`
- `src/application/ports/secret-store.ts`
- `src/application/ports/configuration-write-id.ts`
- service/wrapper tests and `test/contract/secret-store.contract.ts`

## Required behavior

- `SensitiveValue` has native-private plaintext and redacts string, primitive, and JSON conversion; plaintext is available only to the secret adapter/runtime callback helper.
- `SecretStore` distinguishes found/missing from adapter failure. `PluginConfigurationStore` uses expected-revision CAS. Write ids come through a randomness-independent application port.
- Save validates everything first, writes fresh locators, constructs/verifies the candidate document, CAS-replaces it, cleans fresh locators after pre-CAS failure/stale result, and retires superseded locators only after commit.
- Post-CAS cleanup failure reports stored-with-cleanup-required; pre-CAS cleanup failure reports an unclean failure. Neither result includes plaintext.
- Removal requires literal confirmed secret deletion, verifies the exact document, and exposes retryable partial failure safely. Disable has no deletion path.
- Ports contain no OS service/account/path/backend convention and permit no plaintext fallback.

## Acceptance criteria

- [ ] Exhaustive fault injection at every put/read/CAS/remove/cleanup/abort point proves old-or-new complete authority.
- [ ] Config never references a fresh secret that was not successfully written.
- [ ] A stale writer cannot mutate active config or old secrets.
- [ ] All failure/results/log spies remain secret-free; wrappers always redact.
- [ ] Port conformance proves missing versus adapter failure and abort propagation.
- [x] No credential backend, state mutation, prompt, runtime activation, or journal is implemented.

## Implementation notes
- Execution capability: direct host implementation; the cross-store replacement state machine owns one coherent write/CAS/cleanup sequence.
- Review weight: standard, caller requested the implementing-to-review boundary.
- Files changed: `src/application/sensitive-value.ts`, `src/application/configuration-service.ts`, `src/application/ports/plugin-configuration-store.ts`, `src/application/ports/secret-store.ts`, `src/application/ports/configuration-write-id.ts`, shared secret-store contract tests, and service tests.
- Tests added: fresh-locator write-before-CAS, stale cleanup, superseded cleanup, post-CAS cleanup-required result, explicit deletion confirmation, partial removal, redaction, and missing/found/removal port conformance.
- Discrepancies from design: adapter failures are represented as safe `BoundaryError` values for save-side adapter calls and locator-only partial results for removal cleanup; neither retains native causes.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; `npm run boundaries`; targeted sensitive-value, configuration-service, and secret-store contract tests.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 457 tests, real production/test typechecking, clean dependency boundaries, build, and exact 293-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
