# Proof-before-reclaim transactional ownership

Long-lived mutations and recovery artifacts carry explicit ownership evidence; uncertain ownership defers cleanup or recovery rather than risking concurrent destruction.

## Rationale

Wall-clock expiry and process failure are ambiguous. Exact owner tokens, claims, journal references, and complete inventories make crash recovery conservative and replayable.

## Examples

- `src/application/recovery-service.ts:95-123,152-169` reserves successor transitions, defers live/unknown owners, and abandons only after proven death plus grace.
- `src/application/revision-collection-service.ts:118-123,154-159,189-196` defers collection on incomplete lease evidence and rescans authority before deletion.
- `src/application/marketplace-refresh-service.ts:448-474,498,511,563` coalesces active claims unless the owner is proven dead and rechecks exact claim/source identity before publication.
- `src/application/ports/candidate-content-lease.ts:32-44` and `src/application/plugin-candidate-preparation.ts:397-450` transfer staging ownership only through `claim`; all rejected handoffs release still-owned allocation.
- `src/application/marketplace-update-scheduler.ts:124-227` uses explicit renewable lease ownership and fresh mandatory cleanup signals.

## When to use

Use for work crossing awaits, processes, locks, transactions, staging areas, durable journals, or destructive collection.

## When not to use

Do not introduce durable ownership protocols for lexical resources safely handled with `try/finally`.

## Common violations

- Treating unknown as dead.
- Reclaiming solely by elapsed time.
- Deleting after incomplete scans.
- Committing with stale claims.
- Losing cleanup-retry authority.
- Using an already-aborted caller signal for mandatory cleanup.

A missing `ownerStatus` is acceptable only for the documented in-memory transition adapter with no cross-process owner.
