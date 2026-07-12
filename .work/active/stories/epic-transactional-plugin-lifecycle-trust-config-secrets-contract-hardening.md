---
id: epic-transactional-plugin-lifecycle-trust-config-secrets-contract-hardening
kind: story
stage: done
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

- [x] Source and compiled exports contain the intended safe API and no plaintext/backend/prompt/update/activation surface.
- [x] Dependency-cruiser generated violations prove all new boundaries.
- [x] End-to-end fake-port integration proves trust-gated runtime-only secret resolution.
- [x] Leak canaries are absent from every prohibited durable/observable boundary.
- [x] Every security-critical failure class and cleanup outcome has adversarial coverage.
- [x] `npm test` passes typecheck, boundaries, unit/integration tests, build, and compiled export checks.

## Implementation notes
- Execution capability: direct host implementation; final hardening converges the public barrel, package allowlist, dependency rules, and leak/integration evidence.
- Review weight: standard, caller requested the implementing-to-review boundary.
- Files changed: `src/index.ts`, `.dependency-cruiser.cjs`, compiled export/public API tests, tooling boundary regression, integration leak test, and final canonicalization hardening across trust/configuration/resolution services.
- Tests added: fake-port end-to-end save-to-runtime resolution, canary absence from state/results/errors, public safe-export allowlist, compiled ESM import, port boundary violation fixture, optional-secret omission, and wrapper redaction coverage.
- Discrepancies from design: no foundation assertion changed; concrete backend selection, prompts, activation, automatic-update policy, and recovery-journal ownership remain outside this feature.
- Adjacent issues parked: none.
- Verification: full `npm test` (strict typecheck, dependency-cruiser, Vitest, build, and compiled package allowlist).

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane independent verification confirmed 457 tests, real production/test typechecking, clean dependency boundaries, build, and exact 293-export package import. Verdict: Approve - story verified by implement; fast-lane advance.
