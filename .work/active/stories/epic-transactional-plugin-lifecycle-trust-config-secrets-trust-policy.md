---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
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
- [ ] Domain/application dependency boundaries and abort/adapter-failure semantics are tested.
