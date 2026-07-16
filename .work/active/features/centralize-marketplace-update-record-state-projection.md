---
id: centralize-marketplace-update-record-state-projection
kind: feature
stage: drafting
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Centralize Marketplace Update-Record State Projection

## Brief

The refresh and policy services independently interpret the same scope-local marketplace update records and independently rebuild the same user/project mutation envelope. Centralize that application-level state projection so host-config compatibility and project-local routing have one owner without changing schemas, mutation verification, source authority, refresh policy, or public API.

## Discovery Evidence

**Value:** High  
**Source lenses:** duplication / single source of truth / missing abstraction  
**Discovery posture:** direct-read scan of the changed refresh, policy, state-contract, host-config, and generation-coordinator paths; no subagents.

- `src/application/marketplace-refresh-service.ts:71-73` and `src/application/marketplace-update-policy-service.ts:16-18` contain the same `recordsFor` branch and apply `parseMarketplaceUpdateRecord` to the same user-config/project-local collections.
- `src/application/marketplace-refresh-service.ts:80-88` and `src/application/marketplace-update-policy-service.ts:21-32` independently reconstruct the same scope-specific verified mutation. Both must force user host config to `schemaVersion: 2`, preserve complete v2 operational memory exposed through a v1-compatible adapter envelope, and route project records through `marketplaceUpdates`.
- The standard-review fix added the explicit host-config v2 projection comment only to the policy service, while refresh already carried equivalent shape logic. The duplicated boundary is therefore correctness-sensitive rather than cosmetic: future schema or compatibility work must update both paths identically.
- The completed `centralize-host-config-v2-compatibility-projection` item owns only deterministic v1→v2 document shape conversion inside state migration/codec/mutation proof. It does not own application selection and replacement of scope-local update records, so this finding does not re-emit that completed work.

## Current State

```typescript
// marketplace-refresh-service.ts
function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}

function replaceRecord(snapshot: GenerationSnapshot, marketplace: MarketplaceName, replacement: MarketplaceUpdateRecord, sha256: Sha256) {
  const records = recordsFor(snapshot).map((record) => record.marketplace === marketplace ? replacement : record);
  if ("config" in snapshot) {
    const config = { ...snapshot.config, schemaVersion: 2 as const, generation: snapshot.generation, records };
    return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
  }
  const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);
}

// marketplace-update-policy-service.ts repeats recordsFor and the same
// config/project replacement projection as replaceSnapshot.
```

## Target State

Introduce one internal application module, tentatively `src/application/marketplace-update-state.ts`, that owns:

```typescript
export function marketplaceUpdateRecords(
  snapshot: GenerationSnapshot,
): readonly MarketplaceUpdateRecord[];

export function createMarketplaceUpdateRecordsMutation(
  snapshot: GenerationSnapshot,
  records: readonly MarketplaceUpdateRecord[],
  sha256: Sha256,
): StateMutation;
```

Both operations must preserve the exact current behavior:

- parse current and v1-compatible records through `parseMarketplaceUpdateRecord`;
- route user records through host config and project records through `marketplaceUpdates`;
- always project user replacement envelopes to schema v2 without resetting claim, backoff, or notification memory;
- call `parseStateMutation` as the sole verifier/brand constructor;
- remain internal and absent from `src/index.ts`.

`marketplace-refresh-service.ts` should retain only marketplace-specific record lookup/replacement policy and delegate collection access/mutation construction. `marketplace-update-policy-service.ts` should retain preference validation/source authority and delegate the same state mechanics.

## Constraints and Rejections

- Pure refactor only: no schema/default/migration change; no change to source identity comparison, stale-generation behavior, refresh claims, automatic authority, scheduler semantics, notification retention, or public contracts.
- Do not merge this helper with `projectHostConfigV1ToV2`; that domain projection and this application snapshot projection have different validation responsibilities.
- Do not fold in parked `idea-update-source-equality` or `idea-update-notification-pruning`.
- Do not broaden the helper into a generic snapshot mutation framework; two named update-record operations are sufficient.

## Risk

**Medium.** The code movement is small, but an incorrect user/project branch or accidental v1 migration path can erase update operational memory or write the wrong scope family. Keep the helper structural, reuse `parseStateMutation`, and compare emitted mutations before/after for both scope variants.

**Rollback:** revert the extraction and restore the two local helpers. No state migration, durable rewrite, or API transition is involved.

## Verification

- Existing focused tests pass unchanged: `test/application/marketplace-update-policy-service.test.ts`, `test/integration/marketplace-update-policy.test.ts`, host-config/state-contract tests, and refresh service tests.
- Add focused internal tests only if needed to prove identical user-v1-compatible, user-v2, and project-v2 mutation projections; do not duplicate service behavior tests.
- Search confirms one implementation of scope-local marketplace update-record collection access and one implementation of config/project mutation projection under `src/application/`.
- `npm run typecheck`, `npm run boundaries`, `npm run build`, public API tests, and compiled-package import/export verification pass with no export additions or removals.

## Dependency Check

Independent discovery finding. `depends_on: []`; it shares no required sequencing with the composition-ownership finding and introduces no dependency edge or cycle.
