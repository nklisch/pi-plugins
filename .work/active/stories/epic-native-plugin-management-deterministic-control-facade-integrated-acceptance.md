---
id: epic-native-plugin-management-deterministic-control-facade-integrated-acceptance
kind: story
stage: implementing
tags: [compatibility, testing]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-packaged-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove Direct, Headless, and Packed Control Acceptance

## Checkpoint

Exercise every canonical command and facade contract through direct API, headless streams/input channels, concurrent workflows, hostile inputs, offline startup, and a clean compiled package consumer.

## Files

- `test/integration/native-control-direct-api.test.ts`
- `test/integration/native-control-headless.test.ts`
- `test/integration/native-control-workflows.test.ts`
- `test/integration/native-control-concurrency.test.ts`
- `test/integration/native-control-security.test.ts`
- `test/integration/native-control-packed-consumer.test.ts`
- `test/fixtures/native-control/`
- public API, compiled import, and packed Pi consumer tests

## Acceptance evidence

- Every canonical path/alias, help/completion path, preview/apply workflow, operation poll/cancel, page continuation, and exit category runs through the direct facade.
- No-TTY, absent provider, secret prompt unavailable, stdin/file/env policy, exact confirmation, timeout, SIGINT, slow sink, EPIPE, and broken stdout preserve declared behavior.
- Clean compiled bytes start offline without Claude/Codex or unpublished runtimes, expose local status/list/diagnose, and execute a mutation only through admitted `application.control`.
- Same/different plugin races, stale IDs/tokens/cursors/consent, pending transitions, project changes, ambiguity, rollback/recovery, reload, and shutdown return deterministic envelopes.
- Hostile argv/control/bidi/Unicode, unknown/deprecated/partial input, giant values, ANSI/OSC, credentials, paths, secrets, native causes, malformed JSON, and token forgery pass security tests; full `npm test` and exact exports are green.
