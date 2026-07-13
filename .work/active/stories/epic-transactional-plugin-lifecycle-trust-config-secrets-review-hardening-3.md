---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-review-hardening-3
kind: story
stage: done
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

- [x] Exact candidate active: all referenced fresh locators are retained.
- [x] Descendant document preserving candidate locators: preserved locators remain stored.
- [x] Descendant replacing only some locators: cleanup removes only proven-unreferenced fresh locators.
- [x] Proven inactive candidate: unreachable fresh locators are cleaned.
- [x] Unreadable/malformed authority: credentials are retained with safe logical recovery evidence.
- [x] Results contain no values, paths, native causes, or credentials.
- [x] Full real-typechecked suite, boundaries, build, and compiled package import pass.

## Implementation notes

- Execution capability: host-local inline implementation; the caller explicitly prohibited agents and worktree isolation, and the fix is one cohesive reconciliation/cleanup state machine.
- Review weight: standard, source: caller request and story risk.
- Files changed: `src/application/configuration-service.ts`, `test/application/configuration-service.test.ts`, and the parent feature summary.
- Tests added: exact candidate liveness, descendant preservation of all fresh locators, descendant replacement of a subset, proven-inactive cleanup, and malformed-authority safe retention.
- Discrepancies from design: revision-mismatched authority with at least one candidate locator live is reported through the existing stored result using the validated current document; only absent fresh locators and superseded old locators are cleanup candidates.
- Adjacent issues parked: none.

## Verification

- `npm test` — passed: production/test typechecking, dependency boundaries (120 modules / 661 dependencies), 90 Vitest files / 524 tests with no type errors, clean build, and compiled ESM import allowlist (318 exports).

## Review (2026-07-13)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed exact candidate, descendant-all, descendant-subset, inactive, and malformed-authority locator liveness cases plus 524 tests and all gates. Verdict: Approve - story verified by implement; fast-lane advance.
