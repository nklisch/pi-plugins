---
id: epic-transactional-plugin-lifecycle-generation-locking-review-hardening-2
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-generation-locking
depends_on: [epic-transactional-plugin-lifecycle-generation-locking-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-13
updated: 2026-07-12
---

# Close Recursive and Durable-Outcome Locking Gaps

## Scope

Close five blocker/important findings from final adversarial generation-locking review.

## Required fixes

- Prevent same-scheduler recursive acquisition by callback closure from deadlocking. Detect execution context and reject any overlapping recursive request synchronously/at entry with a fixed typed error; disjoint recursion must either be rejected uniformly or proven safe. Do not rely on callback arity.
- Make lazy SQLite database initialization crash-recoverable. An `initializing` marker must carry owner/process identity and be reclaimed only after proving the owner is dead; live/unknown ownership fails closed and remains cancellable. Add kill-between-marker-and-finalize recovery.
- Parse full `GenerationSnapshot` contracts, including required pointers/documents, rather than accepting `{scope,generation}`. Commit-error reconciliation must prove the intended mutation's resulting snapshot/content, not infer it from generation `expected+1` alone. Introduce a mutation/result fingerprint or exact expected resulting evidence sufficient to distinguish unrelated generation advance.
- Close path-marker TOCTOU by binding the opened SQLite handle/database identity to the durable marker and verifying that exact identity before and during ownership. Replacement between open, `BEGIN IMMEDIATE`, and marker reread cannot yield two accepted owners.
- Preserve `commit-failed`/`commit-ambiguous` classification and observed safe evidence when release also fails; cleanup errors must compose without discarding durable-outcome information.
- Add exact recursive closure, stranded initializer crash, malformed full snapshot, unrelated generation advance, open/begin/path replacement, and release-after-ambiguity reproducers.

## Acceptance criteria

- [ ] Recursive same-key scheduler acquisition fails immediately without deadlock.
- [ ] Killed initializer cannot permanently strand a scope and live initializer cannot be stolen.
- [ ] Only complete validated snapshots are accepted.
- [ ] Reconciliation never reports committed for an unrelated generation advance.
- [ ] Database replacement cannot produce two accepted leases across any acquisition boundary.
- [ ] Cleanup failure preserves durable commit classification/evidence.
- [ ] Full real-typechecked suite, boundaries, build, and compiled package import pass.
