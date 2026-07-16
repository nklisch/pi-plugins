---
id: simplify-recovery-ownership-and-reconciliation-step-3
kind: story
stage: implementing
tags: [refactor, infra]
parent: simplify-recovery-ownership-and-reconciliation
depends_on:
  - simplify-recovery-ownership-and-reconciliation-step-1
  - simplify-recovery-ownership-and-reconciliation-step-2
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Remove Only Proven-Unused Recovery Scaffolding

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** elimination / dead weight

Remove helpers, bookkeeping, a fixture, and a no-op branch that have no executable role. Keep every validation, state transition, capability, grace period, and deletion guard.

## Files

- `src/infrastructure/recovery/sqlite-transition-journal.ts`
- `src/application/recovery-service.ts`
- `src/application/revision-collection-service.ts`
- `src/infrastructure/filesystem/staging-allocator.ts`
- `test/fixtures/recovery/child-journal-writer.mjs` (delete)

## Current State

```ts
function sameJson(/* ... */): boolean { /* unused */ }
function tableSql(name: string): string | undefined { return undefined; }
function target(/* ... */) { /* unused */ }
function revisionRef(scope: ScopeReference, revision: InstalledRevisionRecord, sha256: Sha256) { /* scope unused */ }

const byRoot = new Map<string, AllocationRecord>();
byRoot.set(canonical, record);
void byRoot;

const owner = outcome === "recovery-required" || terminal
  ? { pid: null, start: null, nonce: null }
  : { pid: null, start: null, nonce: null };
```

`test/fixtures/recovery/child-journal-writer.mjs` has no executable source, test, or package-script reference. Tracking-item mentions are historical prose only.

## Target State

```ts
function revisionRef(revision: InstalledRevisionRecord, sha256: Sha256): RetainedArtifactRef {
  return {
    kind: "plugin",
    key: createPluginStoreIdentityFromEvidence({
      sourceHash: revision.evidence.source.sourceHash,
      binding: revision.revision,
    }, sha256).key,
  };
}

// Accepted settlements always clear ownership directly.
database.prepare(
  "UPDATE lifecycle_transitions SET status = ?, generation = ?, status_at = ?, owner_pid = NULL, owner_start_token = NULL, owner_nonce = NULL WHERE reference = ?",
).run(outcome, request.generation ?? null, request.at, String(request.reference));

// The opaque WeakMap remains the sole in-memory staging capability registry.
const owned = new WeakMap<object, AllocationRecord>();
```

## Implementation Notes

- Before deletion, repeat symbol/reference searches for every named item.
- Remove journal `sameJson` and `tableSql`; recovery-service `target`; revision-collection `sameJson`; staging `byRoot` declaration, write, comment, and `void`; and import fallout caused by those removals.
- Change `revisionRef` to `(revision, sha256)` and update exactly its three callers. Keep key evidence unchanged.
- Replace the identical owner object conditional with direct SQL `NULL` values. Keep all preceding terminal/status conflict checks and every accepted outcome unchanged.
- Delete the child journal fixture only after confirming no executable reference.
- Do not remove schema checks, owner columns/statuses, complete-scan checks, diagnostics, WeakMap ownership, path identity checks, grace periods, or deletion predicates.

## Acceptance Criteria

- [ ] Every deleted symbol/map/fixture is proven to have no executable caller before removal and no stale import afterward.
- [ ] All three `revisionRef` callers produce equivalent plugin store keys from the same `sourceHash` and revision binding.
- [ ] Journal settlement clears owner PID/start token/nonce for all accepted outcomes exactly as before.
- [ ] Staging allocate/discard still relies on the opaque `owned` WeakMap and passes existing capability tests.
- [ ] Recovery service, revision collection, journal, staging, lifecycle recovery, and collection integration tests pass unchanged.
- [ ] Full `npm test` passes; compiled package exports remain exactly 407.

## Risk and Rollback

Risk is low because each removal is reference-proven, but recovery code is security-sensitive, so no adjacent validation simplification is allowed. Revert this deletion-only commit to restore the scaffolding and fixture. It is independent of the first two refactors after their commits are present and has no persisted-state effect.
