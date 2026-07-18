---
id: epic-native-plugin-management-trusted-installation-contracts-identifiers
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Define trusted-install workflow contracts and bindings

## Checkpoint

Define strict schema-derived session, candidate binding, configuration field, consent disclosure/submission, progress, status, cancellation, and final-result contracts. Add checksum-bound host-epoch session tokens and consent IDs that contain no source, path, project root, configured value, trust surface, or secret.

## Files

- `src/application/trusted-install-contract.ts`
- `src/application/trusted-install-identifiers.ts`
- `src/index.ts`
- `test/application/trusted-install-contract.test.ts`
- `test/application/trusted-install-identifiers.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Acceptance evidence

- Registries are the single source for states, phases, issue codes, stale reasons, and outcomes; public types are schema-inferred.
- Candidate/consent identity changes across scope, project epoch, registration/snapshot, source/revision, descriptors, executable surface, compatibility, and capability capture.
- Forged/oversized tokens, stale versions, cross-session consent, unknown fields, and impossible result combinations fail closed.
- Public schemas structurally exclude sensitive/configured values, locators, roots, raw snapshots, native causes, executable expansions, and command output.

## Implementation notes

- Added strict schema-derived session, binding, disclosure, input, progress, status, cancellation, and activation contracts with registry-owned variant vocabularies.
- Session tokens are UUID lookup capabilities checksum-bound to the host epoch; consent IDs hash the complete exact candidate binding.
- Sensitive submission entries accept only callback-scoped `SensitiveValue`; all public result variants structurally omit values, locators, roots, native causes, and raw lifecycle snapshots.
- Added the shared native requirement view as a narrow inspection contract consumed by trusted-install disclosure.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/trusted-install-identifiers.test.ts test/application/trusted-install-contract.test.ts test/public-api.test.ts` — 14 passed.
