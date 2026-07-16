---
id: centralize-marketplace-update-record-state-projection-step-1
kind: story
stage: implementing
tags: [refactor, infra]
parent: centralize-marketplace-update-record-state-projection
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Extract and Adopt the Marketplace Update-Record State Projection

## Checkpoint

Create one private application helper that reads v1/v2-compatible marketplace update records from user/project generation snapshots and builds scope-correct, verified v2 replacement mutations. Adopt it in refresh and policy without moving either service's policy behavior or changing any public contract.

This is one atomic checkpoint: the helper, both consumers, and focused tests must land together so there is never an unused abstraction, a partial owner, or an uncompilable call-site transition.

## Value and Ownership

**Priority:** High  
**Risk:** Medium  
**Source lens:** missing abstraction / code smell (exact duplication) / single source of truth

`src/application/marketplace-update-state.ts` owns only:

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

Ownership stays layered:

- `parseMarketplaceUpdateRecord` remains the domain owner of current and v1-compatible record parsing.
- `parseStateMutation` remains the sole owner of structural verification, v1→v2 host projection, scope evidence, opaque branding, and deep freezing.
- Refresh retains marketplace lookup/replacement, claims, backoff, promotion, automatic application, and notifications.
- Policy retains request parsing, source authority, local-source restrictions, race checks, preference replacement, and result mapping.
- The new named exports are for application siblings only and must not appear in `src/index.ts` or the package export surface.

## Files

- Add `src/application/marketplace-update-state.ts`.
- Update `src/application/marketplace-refresh-service.ts`.
- Update `src/application/marketplace-update-policy-service.ts`.
- Add `test/application/marketplace-update-state.test.ts`.
- Do not change schemas, migrations, state adapters, `src/index.ts`, foundation docs, or public API allowlists.

## Current State

The record reader is exact duplication:

```typescript
// marketplace-refresh-service.ts:71-74
// marketplace-update-policy-service.ts:16-19
function recordsFor(snapshot: GenerationSnapshot): readonly MarketplaceUpdateRecord[] {
  if ("config" in snapshot) return snapshot.config.records.map((record: unknown) => parseMarketplaceUpdateRecord(record));
  return snapshot.project.marketplaceUpdates.map((record: unknown) => parseMarketplaceUpdateRecord(record));
}
```

Both services also independently construct the same mutation projection:

```typescript
// refresh's replaceRecord after its caller-owned marketplace replacement
if ("config" in snapshot) {
  const config = { ...snapshot.config, schemaVersion: 2 as const, generation: snapshot.generation, records };
  return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { config } }, sha256);
}
const project = { ...snapshot.project, schemaVersion: 2 as const, generation: snapshot.generation, marketplaceUpdates: records };
return parseStateMutation({ scope: snapshot.scope, expectedGeneration: snapshot.generation, replace: { project } }, sha256);

// policy's replaceSnapshot is structurally identical and adds the reason:
// a v1 compatibility envelope must be forced to v2 before verification or
// migration defaults erase claims, backoff, and notification memory.
```

The only difference is upstream: refresh computes `records` by replacing a marketplace record, while policy computes it after source/preference validation. That operation remains caller-owned.

## Target State

Implement the shared module exactly at this responsibility boundary:

```typescript
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
```

Refresh keeps its specific helper, reduced to collection replacement plus delegation:

```typescript
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
```

Policy replaces all three `recordsFor` uses with `marketplaceUpdateRecords`, removes `replaceSnapshot`, and delegates only its final state projection:

```typescript
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

## Implementation Notes

- Preserve array order and current map semantics, including replacement of every matching record if an invalid upstream duplicate is present.
- Parse every selected record through `parseMarketplaceUpdateRecord`. Do not substitute current-only `MarketplaceUpdateRecordSchema.parse`; minimal v1-compatible records must still receive the existing defaults, while rich v2 records exposed inside a v1 envelope must retain all memory.
- Project v1 has no marketplace-update collection. Its existing migration produces an empty v2 collection before this application seam; do not invent project update records or add another migration path.
- Spread the entire existing config/project document, then override only `schemaVersion`, `generation`, and the scope-specific record collection. This preserves installed/snapshot/plugin/declaration and project identity evidence.
- Use `snapshot.scope` and `snapshot.generation` unchanged for mutation scope and expected-generation CAS. Set replacement-document generation to the same snapshot generation.
- Return only `StateMutation` from `parseStateMutation`. Do not expose structural input, clone the private brand, duplicate the deep-freeze implementation, or bypass the injected SHA-256 verifier.
- Keep the compatibility rationale comment beside the user v2 projection in the shared helper, where both consumers now benefit from it.
- Do not generalize into callbacks, strategy objects, a generic snapshot collection helper, a port, or a barrel export.

## Tests

Add `test/application/marketplace-update-state.test.ts` with focused contract coverage:

1. A user v1-compatible envelope containing a minimal v1 record is read through `parseMarketplaceUpdateRecord` and receives current refresh/notification defaults; malformed source or preference data still throws.
2. A rich current record (including claim, last completion, next schedule, consecutive failures, and notification memory) survives record reading unchanged even when a compatibility fixture wraps it in a v1 config envelope.
3. Parameterized user-v1-compatible and user-v2 snapshots produce a verified, recursively frozen `schemaVersion: 2` config mutation with exact scope, `expectedGeneration`, replacement generation, and operational memory.
4. A valid project-v2 snapshot produces a verified, recursively frozen project-only mutation. It retains project identity, project key, declaration digest, marketplace snapshots, and plugin records while replacing only `marketplaceUpdates`.
5. Assertions use `isVerifiedStateMutation` and `Object.isFrozen` on the mutation, replacement document, and records array. Do not duplicate service tests for preference rules, claims, backoff scheduling, lifecycle calls, or notification flow.

Retain and run the existing policy v1-envelope regression plus refresh/policy/state/public-boundary coverage:

```text
npx vitest run \
  test/application/marketplace-update-state.test.ts \
  test/application/marketplace-update-policy-service.test.ts \
  test/application/marketplace-refresh-service.test.ts \
  test/integration/marketplace-update-policy.test.ts \
  test/application/state-contract.test.ts \
  test/integration/state-contracts.test.ts \
  test/public-api.test.ts
npm run typecheck
npm run boundaries
npm run test:unit
npm run test:package
```

## Acceptance Criteria

- [ ] Exactly one application implementation selects `config.records` versus `project.marketplaceUpdates`, and every selected element still uses `parseMarketplaceUpdateRecord`.
- [ ] Exactly one application implementation branches user/project to build marketplace update-record replacement mutations; refresh's `replaceRecord` has no scope branch.
- [ ] User v1-compatible and v2 envelopes always emit verified v2 config replacements without resetting claims, backoff, or notifications.
- [ ] Project v2 emits only the project replacement and retains all non-update project state and identity evidence.
- [ ] Scope, replacement generation, and expected-generation CAS remain bound to the input snapshot for both scope families.
- [ ] Mutations remain opaque, `isVerifiedStateMutation`, deeply frozen, and accepted only through the existing `parseStateMutation` proof path.
- [ ] Source identity, local automatic rejection, claim ownership, backoff, notifications, scheduler/coordinator behavior, service outcomes, and all existing public behavior are unchanged.
- [ ] `src/index.ts` and package exports are unchanged; public API and compiled-package verification pass.
- [ ] Typecheck, dependency boundaries, focused tests, unit suite, and package suite pass.
- [ ] Search finds no service-local `recordsFor` or policy `replaceSnapshot` and no second scope-local update-record projection under `src/application/`.

## Risk and Rollback

**Risk:** Medium. A wrong discriminant branch can write the wrong state family; leaving a compatibility envelope at v1 can erase rich memory; bypassing the verifier can weaken scope/CAS/immutability guarantees. Keeping the helper as a thin composition over the two existing parsers, plus direct user-v1/user-v2/project-v2 mutation tests, limits that risk.

**Rollback:** Revert this checkpoint, remove the helper and focused helper test, restore both local `recordsFor` functions and mutation branches, and restore imports. There is no state migration, durable rewrite, public API transition, feature flag, or irreversible operation.

## Dependencies and Cycle Check

`depends_on: []`. Before creation, `.work/bin/work-view --blocking centralize-marketplace-update-record-state-projection` and `--parent centralize-marketplace-update-record-state-projection` returned no items. This story adds only a parent hierarchy link and no dependency edge, so it cannot create a dependency cycle. It consumes existing host-config v2 compatibility behavior but does not depend on the archived feature as active work.
