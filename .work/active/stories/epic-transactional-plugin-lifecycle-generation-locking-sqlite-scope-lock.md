---
id: epic-transactional-plugin-lifecycle-generation-locking-sqlite-scope-lock
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-contracts-scheduler]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Implement Crash-Released SQLite Scope Locks

## Scope

Implement the local-filesystem `ScopeLockManager` adapter with one scope-specific SQLite database and a held `BEGIN IMMEDIATE` transaction. Use operating-system crash release rather than an expiring lease, so a paused owner cannot resume after unsafe stale takeover.

## Implementation

- Add `src/infrastructure/state/sqlite-scope-lock.ts` and conservative local-filesystem capability support.
- Verify/create a private non-symlink root and derive fixed safe user/project database names.
- Initialize and validate a strict protocol row; store no lifecycle state, generation, owner, token, PID, or mutation data.
- Open Node 24 `DatabaseSync` defensively with extension loading disabled and `timeout: 0`; retry only numeric SQLite busy code 5 through abort-aware bounded jitter.
- Hold the transaction/connection as the lease; release with rollback plus close in `finally`, and let process death release the OS lock.
- Fail closed on unknown/network filesystem policy, failed two-connection/crash-release probe, malformed protocol, insecure artifacts, or non-busy SQLite errors.
- Add real child-process contention, pause, crash, and cancellation fixtures with IPC barriers rather than timing-only assumptions.

## Acceptance criteria

- [ ] Independent processes cannot simultaneously hold one scope transaction; independent scope databases overlap.
- [ ] A killed/crashed holder becomes immediately acquirable, while a paused live holder never expires.
- [ ] Aborted acquisition preserves the exact reason, closes contender connections, and leaves no retry timer.
- [ ] Only SQLite errcode 5 retries; protocol, root, filesystem-policy, and other SQLite failures are redacted adapter errors.
- [ ] Release rolls back and closes in `finally`, is idempotent after success, and reports uncertain cleanup without hiding commit evidence.
- [ ] No lock database/path/connection/native error or protocol internals enter authoritative state or public diagnostics.
- [ ] Strict typecheck, focused unit tests, and child-process tests pass.

## Verification

Run SQLite lock unit and child-process tests, direct test typecheck, dependency boundaries, and canary assertions for database/path/native-error leakage.
