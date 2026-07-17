---
id: epic-native-plugin-management-trusted-installation-contracts-identifiers
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
