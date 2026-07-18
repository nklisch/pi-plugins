---
id: epic-native-plugin-management-trusted-installation-integrated-acceptance
kind: story
stage: done
tags: [compatibility, security, testing]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-packaged-composition-disposal]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Prove trusted installation across offline, race, and recovery cases

## Checkpoint

Add packaged acceptance for the signed choose/inspect → configure/trust → activation-result data flow across clean, offline, hostile, project, cancellation, concurrency, rollback, and recovery conditions. Supply schema-valid mock data only; add no UI code.

## Files

- `test/integration/trusted-installation-clean-environment.test.ts`
- `test/integration/trusted-installation-offline.test.ts`
- `test/integration/trusted-installation-concurrency.test.ts`
- `test/integration/trusted-installation-recovery.test.ts`
- `test/integration/trusted-installation-security.test.ts`
- `test/fixtures/trusted-install/plugin-install-flow.ts`
- `test/fixtures/trusted-install/hostile-values.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Acceptance evidence

- A clean host without Claude/Codex installs and exactly observes a complete skill/hook/MCP plugin through one packaged workflow.
- Acquired external and marketplace-relative candidates activate offline without a second source request.
- User/project scope, project root/trust, catalog/revision, capability, configuration, session, and concurrent lifecycle changes cannot cross-bind consent.
- Missing input, current state, conflict, rejection, cancellation, rollback, recovery-required, and success retain exact safe evidence.
- Secrets/locators, roots, native causes/output/callback errors, hostile control/bidi text, and MCP/header/query/auth values cannot leak.
- Schema-valid fixture data covers all three signed mock steps without HTML, terminal, or renderer assertions; full `npm test` is green.

## Implementation notes

- Added schema-valid data-only evidence for the signed choose/inspect → configure/trust → activation-result hierarchy, including required/defaulted/path/sensitive field identities and complete skill/hook/MCP/subagent disclosure.
- Fixture result vocabulary covers missing input, success, current state, candidate/project staleness, conflict, cancellation with retained preflight, verified rollback, recovery-required, and unavailable capability without plaintext secrets or UI markup.
- Added integrated checks for single-acquisition offline lease transfer, same-scope/plugin mutation serialization, rollback/recovery distinction, retained cancellation evidence, and structural public-evidence redaction.
- Full-suite boundary verification surfaced and removed an inward application import of a composition-owned configuration type; the narrow bound service contract now lives with the application configuration authority.

## Verification

- Focused integrated suite: `npx vitest run test/integration/trusted-installation-clean-environment.test.ts test/integration/trusted-installation-offline.test.ts test/integration/trusted-installation-concurrency.test.ts test/integration/trusted-installation-recovery.test.ts test/integration/trusted-installation-security.test.ts` — 8 passed.
- Full `npm test` — typecheck green; dependency boundaries green (311 modules / 2,171 dependencies); 247 test files, 1,180 tests passed; package build/import green; 651 public root exports and 3 Pi exports; isolated packed Pi startup passed.
