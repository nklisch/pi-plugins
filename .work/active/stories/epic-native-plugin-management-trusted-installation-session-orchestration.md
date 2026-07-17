---
id: epic-native-plugin-management-trusted-installation-session-orchestration
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-configuration-custody, epic-native-plugin-management-trusted-installation-exact-trust-grants, epic-native-plugin-management-trusted-installation-lifecycle-activation-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Orchestrate resumable trusted-install sessions

## Checkpoint

Implement the bounded in-memory state machine behind `open`, `activate`, `run`, `status`, and `cancel`: complete mutation-free missing-input discovery, exact configuration/trust preflight, final authority revalidation, lease transfer, lifecycle result mapping, progress, expiry, retry, and cancellation.

## Files

- `src/application/trusted-install-session.ts`
- `src/application/trusted-install-service.ts`
- `test/application/trusted-install-session.test.ts`
- `test/application/trusted-install-service.test.ts`

## Acceptance evidence

- Staged and one-shot paths execute the same engine and equivalent evidence yields equivalent progress/results.
- Session 15-minute idle/60-minute absolute/5-minute terminal retention, host epoch, token checksum, and version CAS are deterministic.
- Sessions never retain submissions, sensitive/configured values, locators, project roots, resolved facades, or native errors.
- Missing input is complete and mutation-free; retained exact configuration/trust makes safe retries explicit.
- Double activation, callback failure, expiry, cancellation at every boundary, stale authority, rollback, and recovery preserve honest final state.
