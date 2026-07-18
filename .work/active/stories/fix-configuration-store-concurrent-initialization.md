---
id: fix-configuration-store-concurrent-initialization
kind: story
stage: implementing
tags: [infra]
parent: null
depends_on: []
release_binding: 0.1.1
created: 2026-07-18
updated: 2026-07-18
---

# Make configuration-store startup concurrency-safe

The first 0.1.1 GitHub publish run exposed an intermittent `ERR_SQLITE_ERROR: database is locked` while `marketplace-discovery-concurrency.test.ts` started multiple packaged hosts against one configuration database. Local and prior runs usually pass, but startup initialization currently lacks a reliable SQLite busy/retry policy for this ordinary multiprocess race.

Reproduce under GitHub Actions timing, make initialization tolerate the bounded lock window without weakening schema/ownership checks, and retain the concurrent-host acceptance test.

## Resolution

SQLite's `busy_timeout` was configured after `journal_mode`, even though the journal pragma itself may need to wait on another initializing process. Configure a bounded 30-second busy policy before every potentially locking configuration-store pragma. The longer window covers heavily loaded CI runners while remaining below the existing startup operation timeout.

The same CI run exposed ordinary concurrent release operations in the shared revision-lease database. `openIdentityBoundSqliteDatabase` now accepts an explicit bounded timeout while retaining fail-fast zero as the default; only the multiprocess revision-lease owner opts into the 30-second wait.
