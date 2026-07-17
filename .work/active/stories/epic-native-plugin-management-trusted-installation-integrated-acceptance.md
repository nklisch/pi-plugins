---
id: epic-native-plugin-management-trusted-installation-integrated-acceptance
kind: story
stage: implementing
tags: [compatibility, security, testing]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-packaged-composition-disposal]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
