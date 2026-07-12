---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening
kind: story
stage: implementing
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

- [ ] Stale/failed removal CAS cannot delete a credential referenced by active configuration.
- [ ] No public callback/result type can return or serialize plaintext secret values.
- [ ] Project keys and trusted roots are cryptographically/capability bound to validated project identity.
- [ ] Cancellation and post-commit cleanup expose complete safe recovery evidence.
- [ ] Adapter output and error surfaces are runtime validated and secret-safe.
- [ ] Untrusted patterns cannot cause catastrophic backtracking.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
