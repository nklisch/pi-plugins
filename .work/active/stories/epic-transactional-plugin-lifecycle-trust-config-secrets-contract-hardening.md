---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-trust-config-secrets
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets-trust-policy, epic-transactional-plugin-lifecycle-trust-config-secrets-runtime-resolution]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Trust, Configuration, and Secret Contract Hardening

## Scope

Implement Unit 5 of the parent feature after the trust and resolution seams land. Harden public exports and dependency boundaries, add integration/adversarial fixtures and leak canaries, and roll foundation assertions only if implementation changes their current truth. Do not add a credential backend, UI, activation, automatic-update policy, or cleanup journal.

## Files

- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/trust-config-secrets.test.ts`
- `test/fixtures/configuration/`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`
- `test/tooling/boundaries.test.ts`
- foundation docs only if required by implementation drift

## Required behavior

- Export safe schema-derived evidence, policy/services/results, and ports; keep internal validated submissions, plaintext access, adapter conventions, prompts, update authority, activation, and cleanup journals private.
- Enforce domain/application/port inward-only imports and composition-only credential adapter selection.
- Integrate exact trust, project trust, validated save, fake OS secret/config stores, and callback-scoped resolution without secret persistence/leakage.
- Add canaries for state/projection/report/diagnostic/error/log/snapshot/compiled-contract leaks plus source/revision/surface/config/CAS/path/missing-secret/abort/cleanup attacks.
- Preserve rolling foundation truth and exact package export allowlists.

## Acceptance criteria

- [ ] Source and compiled exports contain the intended safe API and no plaintext/backend/prompt/update/activation surface.
- [ ] Dependency-cruiser generated violations prove all new boundaries.
- [ ] End-to-end fake-port integration proves trust-gated runtime-only secret resolution.
- [ ] Leak canaries are absent from every prohibited durable/observable boundary.
- [ ] Every security-critical failure class and cleanup outcome has adversarial coverage.
- [ ] `npm test` passes typecheck, boundaries, unit/integration tests, build, and compiled export checks.
