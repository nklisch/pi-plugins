---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-contract-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Harden Cross-Process Mutation Coordination

## Scope

Close all important findings from deep generation-locking review.

## Required fixes

- Eliminate the public nested scheduler deadlock. Since shipped coordination does not need nesting, prefer removing/narrowing `runNested` rather than preserving an unsound topology; otherwise prove deadlock freedom with the exact parent `[a,b]`, unrelated `[b,c]`, nested `[c]` interleaving.
- Add a real two-process coordinator test against the SQLite lock and shared file-backed generation state proving exactly one same-generation commit and one stale result. Cover process pause, cancellation, and crash release without expiring ownership.
- Prevent SQLite database-path replacement from creating two accepted live owners. Bind initialization to a durable root/database identity marker, verify path identity throughout ownership, never recreate a previously initialized missing/mismatched database silently, and fail closed on replacement.
- Reconcile commit errors/abort after possible durable write while still under the scope lock. Read authority and return typed committed evidence if expected+1 is active; return explicit safe ambiguous/failure evidence otherwise. Never report a bare cancellation that loses a completed commit.
- Runtime-validate every store read/commit response: exact scope and generation; a committed result must equal expected+1. Malformed adapter output fails closed.
- Remove hard-coded project-key prefixes, make platform support claims honest/fail-closed, and ensure tests describe the layer actually exercised.

## Acceptance criteria

- [ ] No supported scheduler API admits the reproduced nested head-of-line deadlock.
- [ ] Child-process integration proves no lost update through the real coordinator and SQLite lock.
- [ ] Database path replacement cannot yield two owners accepted by coordination.
- [ ] Commit-then-throw/abort preserves typed committed evidence after reconciliation.
- [ ] Forged scope/generation store responses are rejected.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
