---
id: idea-packed-corruption-startup-diagnosis
created: 2026-07-17
updated: 2026-07-17
tags: [compatibility]
---

A schema-valid SQLite database whose `current_pointer.pointer_json` carries a mismatched document digest prevents the packed host from reaching a command-reporting state. Pi still discovers `/plugin`, but `/plugin diagnose` publishes no control report and the clean RPC deadline expires instead of returning bounded `STATE_CORRUPT` evidence while the unaffected project scope remains readable.

Reproducer: the expected-failure case in `test/e2e/failure/corruption-staleness.e2e.test.ts`. The test mutates only one test-owned pointer through real SQLite, confirms `PRAGMA integrity_check` remains `ok`, restarts the exact packed Pi 0.80.8 process, and retains the exact no-rewrite/sibling-isolation assertions.
