---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-2
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Close Adjacent Trust Boundary Bypasses

## Scope

Close three blockers discovered by adversarial confirmation after the first hardening pass.

## Required fixes

- Replace heuristic regex acceptance with a demonstrably bounded fail-closed descriptor-pattern language or linear-time engine. Count/reject bounded `{m,n}` quantifiers and compositions; the accepted policy must reject the reproduced eight-fold `a{0,32}` chain without evaluating it.
- Reconcile ambiguous configuration CAS completion before deleting fresh credentials. If replacement may have durably committed and then thrown/aborted, read authority under the mutation boundary: retain credentials when the new document is active; clean only when proven inactive; otherwise return safe recovery evidence and retain rather than break active references.
- Remove public self-issuance of trusted project-root capabilities. Root authority must originate from the validated project-trust/path adapter boundary and remain opaque/unforgeable; callers cannot mint authority for an attacker-selected canonical root through package exports or deep-importable domain constructors.
- Add exact bounded-quantifier timeout-safe, commit-then-throw/abort, read-after-ambiguous, self-issued capability and serialization regressions.

## Acceptance criteria

- [ ] Every accepted descriptor pattern has a bounded evaluation argument; the reproduced `{0,32}` chain is rejected before `RegExp` execution.
- [ ] Ambiguous CAS completion never deletes a credential that an active document may reference.
- [ ] No public or domain-level caller can mint trusted project-root authority.
- [ ] Recovery results contain logical safe evidence only, never values, paths, native causes, or credentials.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
