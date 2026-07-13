---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-3
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-2]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Preserve Descendant Credential Liveness

## Scope

Close the remaining ambiguous-CAS lineage race.

## Required fix

When a configuration replacement may have committed before its response was lost, reconciliation must determine each fresh locator's liveness from the current authoritative document. A different current revision does not prove candidate locators are inactive: a descendant writer may preserve them. Never delete a fresh locator still referenced by the current document. Clean only locators proven unreferenced; when authority cannot be read or validated, retain them and return safe recovery evidence.

## Acceptance criteria

- [ ] Exact candidate active: all referenced fresh locators are retained.
- [ ] Descendant document preserving candidate locators: preserved locators remain stored.
- [ ] Descendant replacing only some locators: cleanup removes only proven-unreferenced fresh locators.
- [ ] Proven inactive candidate: unreachable fresh locators are cleaned.
- [ ] Unreadable/malformed authority: credentials are retained with safe logical recovery evidence.
- [ ] Results contain no values, paths, native causes, or credentials.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
