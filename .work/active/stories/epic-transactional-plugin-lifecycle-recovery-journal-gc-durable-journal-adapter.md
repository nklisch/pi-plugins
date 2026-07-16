---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: [epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Implement the Durable Transition Journal

## Checkpoint

Implement the separate per-scope SQLite recovery journal with exact write-ahead durability, private owner-liveness evidence, resumable and terminal status transitions, and row-level quarantine. The scope-lock protocol database remains unchanged and stores no journal data.

## Required files

- `src/infrastructure/recovery/local-recovery-filesystem.ts`
- `src/infrastructure/recovery/sqlite-transition-journal.ts`
- `test/infrastructure/recovery/sqlite-transition-journal.test.ts`
- `test/fixtures/recovery/child-journal-writer.mjs`

## Constraints

- Use one validated user/project database under `recovery/journal/v1`, rollback journal mode, `synchronous=FULL`, strict schema/protocol, zero native busy timeout, abort-aware jitter, local-filesystem probing, and durable path-identity markers.
- Persist canonical record bytes plus SHA-256 digest before authoritative state can reference the row.
- Prepare is insert-no-replace and idempotent only for byte-identical evidence. Terminal states cannot conflict or reopen.
- Record PID/start-token/nonce only in private adapter columns. Live ownership blocks takeover; dead permits recovery; unknown retains; `recovery-required` releases ownership.
- Quarantine malformed/digest-invalid rows transactionally when the database remains trustworthy. Never emit paths, native errors, owner evidence, or raw bytes.

## Acceptance evidence

- [ ] Child death before commit leaves no row; acknowledged commit survives restart as one complete row.
- [ ] Concurrent exact prepare converges; same-reference mismatch fails/quarantines without overwrite.
- [ ] Allowed status transitions, idempotent repeats, terminal conflicts, and recovery-required resumption are covered.
- [ ] Live/dead/unknown/PID-reuse owner cases are deterministic and safe.
- [ ] One bad row leaves valid siblings available; a bad database blocks only its scope.
- [ ] Durability, marker replacement, nonlocal/insecure root, busy cancellation, and native-detail redaction tests pass.

## Ordering

Depends on the finalized journal schemas. Startup and collection consume this durable adapter after this checkpoint.
