---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening
kind: story
stage: review
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Trust and Secret Transaction Boundaries

## Scope

Close every blocker and important finding from deep trust/configuration/secrets review.

## Required fixes

- Make configuration removal retire the authoritative document by CAS before credential deletion, so stale/failed CAS leaves active references and credentials untouched. Represent post-retirement cleanup failure without losing recovery evidence.
- Replace the unrestricted generic runtime resolver callback result with a safe, constrained contract that cannot return plaintext or secret-bearing containers. Plaintext must remain callback-scoped and unrepresentable in public results.
- Require project scope provenance validation through `createScopeContext`/project identity derivation; do not accept a forged `projectKey`. Bind path resolution to a trusted project-root capability rather than an unrelated caller-controlled base string.
- Make cancellation after any secret write enter cleanup and return typed cleanup evidence; no newly written credential may be silently orphaned.
- Runtime-parse every configuration adapter response before exposing it; malformed revisions/results fail closed with fixed safe errors.
- Remove raw unknown configuration keys from enumerable/serializable errors; use a safe code or non-reversible fingerprint only.
- Eliminate catastrophic backtracking from untrusted descriptor patterns. Use a bounded/safe-regex policy or a linear-time engine with fail-closed validation at descriptor ingestion and runtime defense.
- Add exact concurrency, cancellation, malformed-adapter, forged-scope/path, serialization canary, resolver-return and regex complexity regressions.

## Acceptance criteria

- [x] Stale/failed removal CAS cannot delete a credential referenced by active configuration.
- [x] No public callback/result type can return or serialize plaintext secret values.
- [x] Project keys and trusted roots are cryptographically/capability bound to validated project identity.
- [x] Cancellation and post-commit cleanup expose complete safe recovery evidence.
- [x] Adapter output and error surfaces are runtime validated and secret-safe.
- [x] Untrusted patterns cannot cause catastrophic backtracking.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: host-local inline implementation; the caller explicitly prohibited agents and the changes share one transaction/port boundary.
- Review weight: standard, with the requested stop at `stage: review`.
- Files changed: configuration service/resolver/validation, adapter port response schemas, project scope capability, descriptor regex policy, package exports, and adversarial tests.
- Tests added: stale removal CAS ordering, post-retirement cleanup evidence, cancellation cleanup, discarded resolver completion values, malformed adapter response redaction, unknown-key serialization, forged project-root capability, and catastrophic-regex rejection.
- Discrepancies from design: the resolver consumer now enforces a `Promise<void>` completion contract and discards even adversarial runtime-cast values; project removal accepts an optional path context for user scope and requires the trusted-root capability for project scope.
- Adjacent issues parked: none.

## Verification

- `npm test` — passed: production and test typechecking, dependency boundaries, 80 test files / 485 tests, build, and compiled-package import allowlist (300 exports).
