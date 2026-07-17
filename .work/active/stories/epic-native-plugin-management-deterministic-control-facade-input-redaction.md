---
id: epic-native-plugin-management-deterministic-control-facade-input-redaction
kind: story
stage: done
tags: [compatibility, security]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Implement Explicit Input and Redaction Boundary

## Checkpoint

Add the out-of-band input port, exact confirmation policy, structural redaction checks, and bounded Node stdin/file/environment input adapter. Keep every configuration value out of argv/history and sensitive values callback-scoped through `SensitiveValue`.

## Files

- `src/application/ports/native-control-input.ts`
- `src/application/native-control-input.ts`
- `src/application/native-control-redaction.ts`
- `src/infrastructure/control/node-control-input.ts`
- focused application, infrastructure, and security tests

## Acceptance evidence

- Missing provider/TTY/channel, unavailable secret prompts, partial input, sensitivity mismatches, duplicate/unknown fields, and stale consent return complete issues before later effects.
- Sensitive values are accepted only from provided/Pi, stdin, or owner-only no-follow file channels; environment is non-sensitive-only.
- Trust/update consent pins exact plugin, scope, immutable revision, and executable digest or exact consent ID. Generic `--yes` cannot grant executable trust or automatic-update breadth.
- ASTs, sessions, progress, help, completion, envelopes, human fields, errors, logs, and native callback messages pass secret/path/control canary scans.
- Existing trusted-install/lifecycle configuration validation and custody remain sole business authority.

## Implementation notes

- Added a portable explicit input port with exact execution/purpose/evidence, configuration disclosure, decisions, and deterministic unavailable/invalid results.
- Added one validation bridge that checks key ownership, sensitivity, required input, and exact consent while preserving the existing trusted-install submission as business authority.
- Added structural JSON projection that rejects custody objects/classes/cycles/non-finite data, removes native errors, redacts path-bearing fields, and scrubs unsafe controls.
- Added a bounded, non-prompting Node adapter for single-consumer stdin, owner-only no-follow files, and non-sensitive-only environment input.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/native-control-input.test.ts test/application/native-control-redaction.test.ts test/infrastructure/control/node-control-input.test.ts`
