---
id: idea-packed-corruption-startup-diagnosis
kind: story
stage: done
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: []
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Diagnose packed state corruption without blocking startup

## Original finding

A schema-valid SQLite database whose `current_pointer.pointer_json` carries a mismatched document digest prevents the packed host from reaching a command-reporting state. Pi still discovers `/plugin`, but `/plugin diagnose` publishes no control report and the clean RPC deadline expires instead of returning bounded `STATE_CORRUPT` evidence while the unaffected project scope remains readable.

Reproducer: the expected-failure case in `test/e2e/failure/corruption-staleness.e2e.test.ts`. The test mutates only one test-owned pointer through real SQLite, confirms `PRAGMA integrity_check` remains `ok`, restarts the exact packed Pi 0.80.8 process, and retains the exact no-rewrite/sibling-isolation assertions.

## Fix contract

- Keep a corrupt scope represented as read-only corruption evidence instead of aborting packaged-host composition.
- Publish bounded public `STATE_CORRUPT` diagnosis while unaffected scopes and commands remain usable.
- Never rewrite, default, or infer the damaged authority.
- Cover current-pointer and actively referenced state-blob mutations plus structural corruption classification in packed Pi.

## Resolution

Lifecycle state composition now preserves a corrupt scope as bounded read-only evidence while continuing with healthy sibling scopes. Packaged startup and diagnosis retain current blocked/corrupt installed-content evidence instead of defaulting, rewriting, or aborting command publication.

Verified by focused state-store and readiness tests, packed current-pointer/state-blob corruption scenarios, SQLite integrity checks, the complete E2E lane, and consolidated unit/package acceptance.
