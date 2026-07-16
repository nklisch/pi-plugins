---
id: centralize-marketplace-update-record-state-projection
kind: feature
stage: review
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

## Design Decisions

- **Execution posture:** direct-read only. The target is two bounded application services plus the existing state verifier and state-family schemas; no exploratory fanout or advisory review is warranted for this small, behavior-preserving extraction, and nested agents are prohibited by the delegated task.
- **Ownership:** `src/application/marketplace-update-state.ts` will be the sole internal application owner of (1) selecting scope-local marketplace update records from a generation snapshot and (2) constructing the verified replacement mutation for that collection. Domain record compatibility remains owned by `parseMarketplaceUpdateRecord`; mutation proof, scope binding, v1→v2 host projection, and deep freezing remain owned by `parseStateMutation`.
- **Atomicity:** use one implementation checkpoint. Creating the helper, switching both consumers, and adding focused projection tests form one compile-time-atomic extraction; splitting them would create either an unused abstraction or temporarily retain duplicate ownership without an independent, releasable boundary.
- **Compatibility boundary:** a user compatibility adapter may expose a v1 host-config envelope containing either minimal v1 records or already-rich v2 record payloads. The reader must continue calling `parseMarketplaceUpdateRecord` per record, and mutation construction must force the user envelope to v2 before `parseStateMutation` so rich claim/backoff/notification memory is not sent through v1 defaults. Project v1 has no update-record collection and continues to migrate to an empty v2 collection before reaching this application seam; the helper must not invent project update authority.
- **Visibility:** the helper uses named module exports for application siblings only. It must not be re-exported from `src/index.ts`, added to package export tests, or exposed through a service interface.

## Verified Duplication

The extraction is exact rather than merely similar:

- `marketplace-refresh-service.ts:71-74` and `marketplace-update-policy-service.ts:16-19` are byte-for-byte equivalent `recordsFor` implementations: both branch on `"config" in snapshot`, select `config.records` or `project.marketplaceUpdates`, and map every element through `parseMarketplaceUpdateRecord`.
- `marketplace-refresh-service.ts:80-88` and `marketplace-update-policy-service.ts:21-32` build the same user/project mutation envelope with the same `snapshot.scope`, `snapshot.generation` CAS value, forced schema v2, scope-specific collection property, and `parseStateMutation` verifier. Refresh performs marketplace replacement immediately before that projection; policy receives its already-replaced collection. That caller-owned selection is the only meaningful difference and remains outside the helper.
- `state-contract.ts:253-285` confirms `parseStateMutation` is the sole verifier/brand constructor: it validates structural input, recomputes project scope evidence, converts user v1 envelopes to v2 where needed, deep-freezes the result, and registers the verified mutation in a private `WeakSet`. The extraction must delegate to it rather than parse a structural mutation schema directly.

The mandatory refactor lenses found no additional work worth coupling here: no removable compatibility path, dead export, established pattern file, or project-specific refactor convention exists in this bounded area. General installed-plugin snapshot helpers elsewhere have different collections and invariants, so a generic snapshot-mutation framework would add concepts rather than remove them.

## Refactor Overview

Extract the two duplicated scope-projection operations into one narrow application module, then leave refresh and policy responsible only for their distinct marketplace policy. This removes two duplicate record readers and two duplicate user/project mutation branches while preserving every observable service result, state validation boundary, and public export.

## Refactor Steps

### Step 1: Extract and adopt the marketplace update-record state projection

**Priority:** High  
**Risk:** Medium  
**Source Lens:** missing abstraction / code smell (exact cross-service duplication) / single source of truth  
**Files:** `src/application/marketplace-update-state.ts`, `src/application/marketplace-refresh-service.ts`, `src/application/marketplace-update-policy-service.ts`, `test/application/marketplace-update-state.test.ts`  
**Story:** `centralize-marketplace-update-record-state-projection-step-1`

**Current State:**

```typescript
// src/application/marketplace-refresh-service.ts
function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}

function replaceRecord(snapshot: GenerationSnapshot, marketplace: MarketplaceName, replacement: MarketplaceUpdateRecord, sha256: Sha256): ReturnType<typeof parseStateMutation> {
  const records = recordsFor(snapshot).map((record) => record.marketplace === marketplace ? replacement : record);
  if ("config" in snapshot) {
    const config = { ...snapshot.config, schemaVersion: 2 as const, generation: snapshot.generation, records };
    return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
  }
  const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);
}

// src/application/marketplace-update-policy-service.ts
function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}

function replaceSnapshot(snapshot: GenerationSnapshot, records: readonly MarketplaceUpdateRecord[], sha256: Sha256): ReturnType<typeof parseStateMutation> {
  if ("config" in snapshot) {
    // A compatibility store may return a v1 envelope, but a policy mutation
    // must always carry the complete v2 records forward. Leaving the envelope
    // at v1 routes through the migration defaults and erases claims, backoff,
    // and notification memory.
    const config = { ...snapshot.config, schemaVersion: 2 as const, generation: snapshot.generation, records };
    return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
  }
  const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);
}
```

**Target State:**

```typescript
// src/application/marketplace-update-state.ts
import {
  parseMarketplaceUpdateRecord,
  type MarketplaceUpdateRecord,
} from "../domain/update-policy.js";
import type { Sha256 } from "../domain/source.js";
import {
  parseStateMutation,
  type GenerationSnapshot,
  type StateMutation,
} from "./state-contract.js";

export function marketplaceUpdateRecords(
  snapshot: GenerationSnapshot,
): readonly MarketplaceUpdateRecord[] {
  const records = "config" in snapshot
    ? snapshot.config.records
    : snapshot.project.marketplaceUpdates;
  return records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}

export function createMarketplaceUpdateRecordsMutation(
  snapshot: GenerationSnapshot,
  records: readonly MarketplaceUpdateRecord[],
  sha256: Sha256,
): StateMutation {
  if ("config" in snapshot) {
    // Compatibility adapters may expose a v1 envelope around rich v2 records.
    // Force v2 before verification so migration defaults cannot erase their
    // claims, backoff, or notification memory.
    const config = {
      ...snapshot.config,
      schemaVersion: 2 as const,
      generation: snapshot.generation,
      records,
    };
    return parseStateMutation({
      scope: snapshot.scope,
      expectedGeneration: snapshot.generation,
      replace: { config },
    }, sha256);
  }
  const project = {
    ...snapshot.project,
    schemaVersion: 2 as const,
    generation: snapshot.generation,
    marketplaceUpdates: records,
  };
  return parseStateMutation({
    scope: snapshot.scope,
    expectedGeneration: snapshot.generation,
    replace: { project },
  }, sha256);
}

// marketplace-refresh-service.ts retains marketplace-specific replacement.
function recordFor(snapshot: GenerationSnapshot, marketplace: MarketplaceName): MarketplaceUpdateRecord | undefined {
  return marketplaceUpdateRecords(snapshot).find((record) => record.marketplace === marketplace);
}

function replaceRecord(
  snapshot: GenerationSnapshot,
  marketplace: MarketplaceName,
  replacement: MarketplaceUpdateRecord,
  sha256: Sha256,
): StateMutation {
  const records = marketplaceUpdateRecords(snapshot).map((record) =>
    record.marketplace === marketplace ? replacement : record,
  );
  return createMarketplaceUpdateRecordsMutation(snapshot, records, sha256);
}

// marketplace-update-policy-service.ts keeps preference/source policy and delegates state mechanics.
const record = marketplaceUpdateRecords(loaded.snapshot).find(
  (candidate) => candidate.marketplace === marketplace,
);
// ...same source/local/unchanged checks...
const current = marketplaceUpdateRecords(context.snapshot).find(
  (candidate) => candidate.marketplace === marketplace,
);
// ...same race checks and MarketplaceUpdateRecordSchema parse...
const records = marketplaceUpdateRecords(context.snapshot).map((candidate) =>
  candidate.marketplace === marketplace ? next : candidate,
);
return {
  mutation: createMarketplaceUpdateRecordsMutation(
    context.snapshot,
    records,
    dependencies.sha256,
  ),
  value: preference,
};
```

`src/index.ts` remains byte-for-byte unchanged. The helper's module exports are private to the package application layer, while `parseStateMutation` remains the only owner of verified mutation branding and immutability.

**Implementation Notes:**

- Move only collection selection and replacement-envelope construction. Do not move `recordFor`, marketplace equality/replacement, source-identity checks, local-source restrictions, claim handling, backoff calculation, notifications, scheduler behavior, or lifecycle calls.
- Replace every `recordsFor` call in both services with `marketplaceUpdateRecords`; replace only the final mutation projection with `createMarketplaceUpdateRecordsMutation`. Preserve array order and the current map semantics, including replacement of every matching record if malformed upstream state somehow contains duplicates.
- Keep `parseMarketplaceUpdateRecord` inside the shared reader so both minimal v1-compatible records and current v2 records pass through the existing strict domain boundary. Do not call `MarketplaceUpdateRecordSchema.parse` directly in the state helper because that would drop v1 compatibility.
- Force `schemaVersion: 2` and overwrite document `generation` with `snapshot.generation` in both branches before verification. Spread the complete existing config/project document first so unrelated state is retained; replace only `records` or `marketplaceUpdates`.
- Return `StateMutation`, never `StateMutationInput` or `UnverifiedStateMutation`. Call `parseStateMutation` exactly once per branch with the original scope, `expectedGeneration`, and injected SHA-256 verifier; do not copy branding/freezing logic.
- Add no barrel export, package export, generic scope strategy, callback, or new port. Existing application-boundary dependency rules permit the helper's inward domain imports and same-layer state-contract import.

**Acceptance Criteria:**

- [ ] `src/application/` contains exactly one implementation that chooses marketplace update records from user `config.records` versus project `project.marketplaceUpdates`, and exactly one implementation that projects those records into scope-correct replacement mutations.
- [ ] `marketplaceUpdateRecords` parses each record with `parseMarketplaceUpdateRecord`; tests prove minimal v1-compatible records receive current defaults, rich records preserve claim/backoff/notification memory, and malformed records still fail rather than reaching service policy.
- [ ] User-v1-compatible and user-v2 snapshots both emit a `schemaVersion: 2` config replacement with unchanged record operational memory, original scope, and `expectedGeneration === snapshot.generation`.
- [ ] A project-v2 snapshot emits only a project replacement, keeps identity/project key/declaration/snapshot/plugin fields, replaces only `marketplaceUpdates`, and preserves scope and expected generation.
- [ ] Every emitted value satisfies `isVerifiedStateMutation`, is frozen together with its replacement document/record collection, and is produced by `parseStateMutation`; no structural mutation type reaches `LifecycleStateStore`.
- [ ] Refresh claim acquisition/publication/failure paths, backoff, notification emission, policy source-race checks, local automatic rejection, and coordinator CAS outcomes remain unchanged under existing service and integration tests.
- [ ] `src/index.ts`, public API runtime/type allowlists, and compiled package exports have no addition or removal.
- [ ] Focused verification passes: `npx vitest run test/application/marketplace-update-state.test.ts test/application/marketplace-update-policy-service.test.ts test/application/marketplace-refresh-service.test.ts test/integration/marketplace-update-policy.test.ts test/application/state-contract.test.ts test/integration/state-contracts.test.ts test/public-api.test.ts`.
- [ ] Full verification passes: `npm run typecheck`, `npm run boundaries`, `npm run test:unit`, and `npm run test:package`.
- [ ] Search confirms the old local `recordsFor` and `replaceSnapshot` helpers are gone and `replaceRecord` contains no user/project branch.

**Risk:** Medium. The extraction can accidentally route user records to project state, leave a compatibility user envelope at v1, reset rich operational memory through migration defaults, weaken strict parsing, omit generation/scope evidence, or expose a new public API. The target keeps all proof and migration work in existing parsers and tests all three reachable envelope/scope variants directly.

**Rollback:** Revert this single checkpoint: restore each service's local `recordsFor` and mutation branch, remove `marketplace-update-state.ts` and its focused test, and restore imports. No schema migration, persistent rewrite, feature flag, public contract, or irreversible state transition is introduced.

## Test Plan

Create `test/application/marketplace-update-state.test.ts` as the contract-level home for this internal seam:

1. **Record compatibility and strictness:** feed a user v1-compatible envelope with a minimal v1 record and assert domain defaults; feed a rich record and assert claim/backoff/notifications survive; feed malformed source/policy data and assert parsing throws. Repeat collection routing with a project-v2 snapshot rather than inventing unsupported project-v1 records.
2. **User mutation matrix:** parameterize v1-compatible and v2 config envelopes around the same rich record, replace the collection, and assert a verified/frozen v2 config mutation with exact scope/CAS and preserved operational fields.
3. **Project mutation:** build a valid project-v2 snapshot, replace its collection, and assert a verified/frozen project mutation retaining project identity, key, declaration digest, marketplace snapshots, and plugins while changing only `marketplaceUpdates`.
4. **Service regression:** retain the policy service's v1-compatible rich-record test and all refresh/policy integration tests. Avoid duplicate assertions about preference, source authority, claims, retry/backoff, and notification flow in the helper unit test.
5. **Boundary regression:** leave public API tests and `src/index.ts` unchanged; package-import and dependency-cruiser checks prove the helper remains private and layer-correct.

## Dependencies and Cycle Check

- Feature dependency remains `depends_on: []`.
- The sole child story has `depends_on: []`; there is no sibling sequence to encode.
- `.work/bin/work-view --blocking centralize-marketplace-update-record-state-projection` and `--parent centralize-marketplace-update-record-state-projection` returned no items before story creation. Adding a parent link from the story creates hierarchy, not a dependency edge, so no cycle is introduced.
- This design does not depend on or recreate archived `centralize-host-config-v2-compatibility-projection`; it consumes that existing `parseStateMutation`/`projectHostConfigV1ToV2` behavior. The separate composition-ownership finding neither imports nor is imported by this helper.

## Implementation notes

- Execution capability: inline direct-read implementation; the feature was one cohesive, behavior-preserving extraction and nested agents were prohibited.
- Review weight: standard from project conventions; feature is intentionally left at `stage: review` for the requested downstream review boundary.
- Files changed: `src/application/marketplace-update-state.ts`, `src/application/marketplace-refresh-service.ts`, `src/application/marketplace-update-policy-service.ts`, `test/application/marketplace-update-state.test.ts`, and the child story checkpoint.
- Tests added/removed: added internal state-projection contract coverage for user v1-compatible/v2 and project v2 snapshots; no tests removed.
- Simplification: refresh and policy now share one record reader and one verified scope projection while retaining their distinct marketplace policy behavior.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Integrated verification: focused projection/service/state/public-boundary tests passed; `npm test` passed with 122 test files and 652 tests, dependency boundaries clean, and compiled-package verification passed with exactly 437 exports.
- Child checkpoint: `centralize-marketplace-update-record-state-projection-step-1` advanced directly to `stage: done` in the implementation commit.

## Implementation Order

1. `centralize-marketplace-update-record-state-projection-step-1` — extract the internal helper, adopt it in both services, add focused projection coverage, and run focused plus full verification as one atomic checkpoint.
