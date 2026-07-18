---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
---

# Canonical Executable Surface and Exact Trust Policy

## Scope

Implement Unit 1 of the parent feature: one registry-derived canonical executable surface, exact trust candidate/grant/revoke/diff policy, project-trust port, and trust authorization service. Reuse and verify the completed `TrustSubjectEvidence`, source, materialization-binding, normalized plugin, compatibility, scope, and component contracts. Do not prompt, persist state directly, decide automatic-update policy, implement Pi project trust, or activate components.

## Files

- `src/domain/executable-surface.ts`
- `src/domain/trust-policy.ts`
- `src/domain/state/installed-state.ts`
- `src/application/trust-service.ts`
- `src/application/ports/project-trust.ts`
- corresponding domain/application tests

## Required behavior

- `ExecutableSurfaceKindRegistry` is the single source for skill, hook, MCP, and configuration-descriptor trust entries, canonical ordering, digest projection, diff routing, and exhaustiveness. Installed-state evidence must consume it instead of retaining a second private fingerprint implementation.
- Exact trust binds scope, verified canonical marketplace/plugin sources, recomputed source/content materialization binding, and surface digest. Compatibility inventory must be complete and activatable; marketplace-relative revisions must match the verified marketplace source.
- Grant/revoke are idempotent for one exact subject; absent/revoked/mismatched evidence denies. No plugin/source/revision wildcard inference.
- Project authorization requires `ProjectTrustPort` to report the exact `ProjectKey` trusted before exact plugin trust is evaluated. User scope is independent.
- Trust diff exposes safe source/revision and added/removed/changed surface summaries only; no configured values, secret locators, arbitrary declarations in diagnostics, or native causes.

## Acceptance criteria

- [ ] Every execution-defining component/descriptor change changes the digest; ordering/provenance-only changes do not.
- [ ] Forged source hashes, materialization binding, compatibility identity/inventory, digest, or subject fail before authorization.
- [ ] Exact grant/revoke policy and project-trust gating pass adversarial scope/source/revision tests.
- [ ] Registry exhaustiveness makes a future executable variant fail compilation/tests until handled.
- [ ] Trust-change output is presentation-ready and secret/config-value free.
- [x] Domain/application dependency boundaries and abort/adapter-failure semantics are tested.

## Implementation notes
- Execution capability: direct host implementation; trust policy and executable-surface contracts are tightly coupled and share one write surface.
- Review weight: standard, caller did not request independent review during the stop-at-review implementation boundary.
- Files changed: `src/domain/executable-surface.ts`, `src/domain/trust-policy.ts`, `src/domain/state/installed-state.ts`, `src/application/trust-service.ts`, `src/application/ports/project-trust.ts`, and corresponding domain/application tests.
- Tests added: canonical surface ordering/digest and foreign exclusion; exact grant/revoke/evidence evaluation and safe trust diffs; project-trust gating, stable denial codes, abort, and adapter-failure redaction.
- Discrepancies from design: surface entries use explicit `valueKind` and a redacted constraints projection; configuration defaults and provenance are excluded from trust bytes as intended.
- Adjacent issues parked: none.
- Verification: `npm run typecheck`; `npx vitest run test/domain/executable-surface.test.ts test/domain/trust-policy.test.ts test/application/trust-service.test.ts`; existing installed-state and state-contract integration tests.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 457 tests, real production/test typechecking, clean dependency boundaries, build, and exact 293-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
