---
id: epic-transactional-plugin-lifecycle-generation-locking-filesystem-lease
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

# Implement Secure Filesystem Scope Leases

## Scope

Implement the local-filesystem `ScopeLockManager` adapter with exclusive lock directories, strict random-token owner records, heartbeat renewal, ownership assertions, cancellation, and rename-based abandoned-owner takeover. Fail closed where required primitives cannot be demonstrated.

## Implementation

- Add `src/infrastructure/filesystem/file-scope-lock.ts` and private owner-protocol support.
- Derive fixed safe scope directory names under a caller-private root; reject symlinks and malformed artifacts.
- Use exclusive directory creation and atomic owner replacement with secure permissions.
- Renew leases by heartbeat and require canonical token equality for assertions and release.
- Reclaim expired/ownerless locks only after grace and unchanged-observation checks through atomic rename.
- Add real child-process contention/crash fixtures with IPC barriers rather than timing-only assumptions.
- Redact paths, owner tokens, and native causes from public failures.

## Acceptance criteria

- [ ] Independent processes cannot simultaneously hold one scope; independent scopes overlap.
- [ ] Crashed owners become reclaimable after expiry/grace, while resumed old owners fail ownership checks.
- [ ] Simultaneous stale reclaimers yield one winner and never delete the successor.
- [ ] Heartbeat, cancellation, malformed artifacts, symlinks, and token mismatch fail safely.
- [ ] Release is idempotent for the owner and cannot remove another lease.
- [ ] Unsupported/non-local filesystem primitives produce `BoundaryError(ADAPTER_FAILED)`, never in-process-only degradation.
- [ ] Focused unit and child-process tests plus strict typecheck pass.

## Verification

Run filesystem lease unit tests, child-process contention tests, direct test typecheck, dependency boundaries, and leak/canary assertions for owner/path material.
