---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-integration-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: [epic-transactional-plugin-lifecycle-recovery-journal-gc-startup-recovery, epic-transactional-plugin-lifecycle-recovery-journal-gc-retention-collection]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Integrate Crash Recovery and Revision Collection

## Checkpoint

Compose Node recovery adapters, prove restart/crash/concurrency/retention behavior with real child processes and filesystem roots, lock down dependency/public boundaries, and roll foundation assertions forward only where landed contracts require it.

## Required files

- `src/infrastructure/recovery/create-node-recovery-adapters.ts`
- `src/index.ts`
- `.dependency-cruiser.cjs`
- `test/integration/lifecycle-recovery.test.ts`
- `test/integration/revision-collection.test.ts`
- package/public/boundary tests
- foundation docs only if current assertions become false or misleading

## Constraints

- Composition exposes typed services/ports but no SQLite handles, schema SQL, path codecs, owner evidence, scanner-capability constructors, quarantine bytes, arbitrary deletion, or state-replacement helpers.
- Use real temporary roots and child processes to kill operations at durable boundaries, restart, recover user/project scopes, hold/release old-revision leases, advance injected time, prune state, and collect content.
- Whole-plugin projections retain skill/hook/MCP evidence but integration never executes those runtime components.
- Dependency rules keep policy/application inward and filesystem/SQLite/process effects outward; ordinary lifecycle/source/runtime code cannot import deletion internals.
- Effective feature review remains `standard`: one independent pass, receiver adjudication, accepted blocker fixes, full verification, and completion without a second pass.

## Acceptance evidence

- [ ] Real restart proves candidate finalization, conservative verified rollback, missing/corrupt journal isolation, live-owner non-takeover, dead-owner recovery, and unrelated availability.
- [ ] Cross-process leases retain old revisions until release/death plus complete-scan grace; shared roots survive references from another scope.
- [ ] State pruning precedes physical deletion; projections, revisions, staging, and persistent data follow separate policies.
- [ ] Public source/compiled export allowlists and dependency canaries expose no second mutation engine or raw deletion/owner/path/secret surface.
- [ ] Foundation statements remain rolling-current without migration prose or overclaimed platform/liveness guarantees.
- [ ] Full `npm test` passes strict production/test typechecking, boundaries, unit/integration/child-process tests, build, and exact compiled package import.

## Ordering

Final convergence checkpoint after startup recovery and retention collection. The feature becomes eligible for feature-level review only after both predecessors and this integration evidence are complete.
