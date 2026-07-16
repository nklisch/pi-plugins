---
id: centralize-host-config-v2-compatibility-projection
kind: feature
stage: done
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

# Centralize the Host-Config v2 Compatibility Projection

## Brief

The host-config v1→v2 compatibility shape is hand-copied across strict migration, tolerant decoding, verified mutation construction, and commit-evidence comparison:

- `src/domain/state/config-state.ts:53-65` owns the registered strict migration.
- `src/domain/state/codec.ts:269-284` independently adds the same refresh and notification defaults while preserving record-level quarantine.
- `src/application/state-contract.ts:275-279` independently projects v1 mutation input to v2.
- `src/application/generation-mutation-coordinator.ts:333-343` independently rebuilds that projection when comparing v1 adapter evidence with a v2 mutation.

Extract one host-config compatibility projection owned by the state domain and reuse it at these four boundaries. Preserve each caller's existing validation and corruption-isolation behavior: the shared operation should own only the deterministic shape change (`schemaVersion`, refresh defaults, and notification defaults), not collapse strict parsing and tolerant record decoding into one path.

## Value

**Priority:** High  
**Risk:** Medium  
**Source lens:** missing abstraction / single source of truth

This removes four copies of migration policy from security-sensitive state paths and makes future host-config version changes update one projection rather than codec, mutation, and commit-proof logic separately.

## Constraints

- Preserve byte-for-byte equivalent v2 values for every currently accepted v1 host-config document.
- Preserve record-granular quarantine in `decodeStateDocument`; malformed siblings must not become document-fatal.
- Preserve strict mutation verification and v1 adapter-envelope compatibility.
- Do not alter installed-user or project-local migration behavior in this refactor; their compatibility paths have different shape and validation concerns.
- Do not change schemas, public exports, update defaults, or corruption guarantees.

## Verification focus

Use the existing host-config migration, codec corruption-isolation, state-mutation, and generation-coordinator compatibility tests. Add only a focused equivalence test if the shared projection is not already exercised through all four boundaries.

## Design Decisions

- **Direct-read design:** the target is four known call sites around one bounded state-domain shape, so no exploratory fan-out is warranted. Advisory delegation is also excluded by this isolated task's no-subagent boundary.
- **Projection, not parsing:** `config-state.ts` will own an internal-module export that only spreads the v1 envelope, changes `schemaVersion` to `2`, and adds `{ nextScheduledAt: 0, consecutiveFailures: 0 }` plus `[]` to object records. It deliberately preserves unknown root fields, unknown record fields, and non-object record entries so each caller's existing schema or quarantine path remains authoritative.
- **Strict local-source normalization stays local:** registered strict migration currently changes a v1 `local-git` record with `updateApplication: "automatic"` to `"manual"` through `createMarketplaceConfigurationRecord`. The tolerant codec currently projects that same raw record and then quarantines it under the v2 record schema; verified mutation parsing rejects it; commit proof does not accept it as equivalent. The strict migrator must normalize only this field before invoking the shared shape projection. Moving that policy into the projection would silently change three callers.
- **No package export:** callers import the operation directly from `domain/state/config-state.js`, but `src/index.ts`, `test/public-api.test.ts`, and `test/compiled-package-import.mjs` remain unchanged. The package's 434-export contract must remain unchanged.
- **One checkpoint:** helper extraction and all four substitutions form one cohesive compatibility change. Splitting them would temporarily retain two policy sources without creating useful independent ownership or rollback boundaries.

## Duplication and Caller-Difference Proof

All four sites currently write the same compatibility constants:

```typescript
schemaVersion: 2
refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }
notifications: []
```

Their enclosing responsibilities are intentionally different:

| Boundary | Current input gate | Current post-projection behavior that must remain local |
|---|---|---|
| `migrateHostV1` in `config-state.ts` | `HostConfigDocumentSchemaV1.parse(input)` | Normalizes `local-git` automatic updates to manual, then strictly parses the complete v2 document. Every child is already a typed object. |
| `parseRoot` in `codec.ts` | Version/readable-root guards only; children remain `unknown` | Keeps primitives and arrays unchanged and object-child defects intact, then `decodeRecords` quarantines identifiable malformed records independently. |
| `parseStateMutation` in `state-contract.ts` | `StateMutationInputSchema.parse(input)` | Strictly parses the projected v2 replacement before deep-freezing and WeakSet-branding it. Every v1 child is already a typed object. |
| `compatibleDocumentEqual` in `generation-mutation-coordinator.ts` | `validateSnapshot` first strictly accepts the v1/v2 adapter envelope; this function then checks v1-actual/v2-expected versions and record arrays | Compares projected adapter evidence structurally; it does not repair or brand output. Its local predicate currently spreads arrays as objects, unlike the codec, but validated host-config envelopes make array children unreachable. Adopting the codec-safe object predicate is therefore behavior-preserving for every accepted adapter value. |

The copies are therefore exact at the deterministic shape level, not at validation or policy level. The extraction centralizes only that common subset.

## Refactor Overview

Introduce `projectHostConfigV1ToV2` beside the host-config schemas and registered migration. It accepts the smallest tolerant structural contract needed by every caller (`records: readonly unknown[]`), preserves the rest of the envelope generically, and returns a v2-shaped unvalidated projection. Replace the four literal projections with this operation while retaining each call site's preconditions and follow-on validation unchanged.

The mandatory scan found no valuable elimination, dead-weight, naming, pattern, or project-convention work adjacent to this extraction. `createMarketplaceConfigurationRecord` remains the current-record constructor for general update-policy call sites; deleting it or changing its defaults would exceed this compatibility-only refactor. Installed-user and project-local compatibility branches remain separate because they do not share the host-config record shape. No project refactor-conventions catalog is present.

## Refactor Steps

### Step 1: Extract and adopt the host-config v1→v2 shape projection

**Priority**: High  
**Risk**: Medium  
**Source Lens**: missing abstraction / single source of truth  
**Files**: `src/domain/state/config-state.ts`, `src/domain/state/codec.ts`, `src/application/state-contract.ts`, `src/application/generation-mutation-coordinator.ts`, `test/domain/state/config-state.test.ts`, `test/domain/state/codec.test.ts`, `test/application/state-contract.test.ts`, `test/application/generation-mutation-coordinator.test.ts`  
**Story**: `centralize-host-config-v2-compatibility-projection-step-1`

**Current State**:

```typescript
// config-state.ts — strict migration also normalizes local-git update policy.
return HostConfigDocumentSchemaV2.parse({
  schemaVersion: 2,
  generation: value.generation,
  records: value.records.map((record) => createMarketplaceConfigurationRecord({
    marketplace: record.marketplace,
    source: record.source,
    updateApplication: record.source.kind === "local-git" ? "manual" : record.updateApplication,
  })),
});

// codec.ts — tolerant child projection.
candidate = { ...input, schemaVersion: 2, records: input.records.map((record) => isRecord(record)
  ? { ...record, refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }, notifications: [] }
  : record) };

// state-contract.ts — strict verified-mutation projection.
config: HostConfigDocumentSchema.parse(replace.config.schemaVersion === 1 ? {
  ...replace.config,
  schemaVersion: 2,
  records: replace.config.records.map((record) => ({ ...record, refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }, notifications: [] })),
} : replace.config)

// generation-mutation-coordinator.ts — raw adapter-evidence comparison.
const records = actualRecord.records.map((record) => record !== null && typeof record === "object"
  ? { ...(record as Record<string, unknown>), refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }, notifications: [] }
  : record);
return sameJson({ ...actualRecord, schemaVersion: 2, records }, expectedRecord);
```

**Target State**:

```typescript
// config-state.ts — an unvalidated, deterministic shape operation.
function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function projectHostConfigV1ToV2(
  input: Readonly<{ records: readonly unknown[] }>,
): Readonly<Record<string, unknown> & {
  schemaVersion: 2;
  records: readonly unknown[];
}> {
  return {
    ...input,
    schemaVersion: 2,
    records: input.records.map((record) => isObjectRecord(record)
      ? { ...record, refresh: { nextScheduledAt: 0, consecutiveFailures: 0 }, notifications: [] }
      : record),
  };
}

function migrateHostV1(input: unknown): HostConfigDocumentV2 {
  const value = HostConfigDocumentSchemaV1.parse(input);
  const normalized = {
    ...value,
    records: value.records.map((record) => ({
      ...record,
      updateApplication: record.source.kind === "local-git" ? "manual" : record.updateApplication,
    })),
  };
  return HostConfigDocumentSchemaV2.parse(projectHostConfigV1ToV2(normalized));
}

// codec.ts — keep the current version/object/array guards and later quarantine path.
candidate = projectHostConfigV1ToV2(input);

// state-contract.ts — strict schema parsing and opaque branding remain unchanged.
config: HostConfigDocumentSchema.parse(
  replace.config.schemaVersion === 1
    ? projectHostConfigV1ToV2(replace.config)
    : replace.config,
)

// generation-mutation-coordinator.ts — keep its envelope/array guards and sameJson.
return sameJson(projectHostConfigV1ToV2(actualRecord), expectedRecord);
```

**Implementation Notes**:

- Import `projectHostConfigV1ToV2` from `../domain/state/config-state.js` in the three non-domain callers. Do not re-export it from `src/index.ts`.
- Remove `createMarketplaceConfigurationRecord` from `config-state.ts` only if it becomes unused there; do not alter or remove the constructor in `domain/update-policy.ts`.
- Keep `codec.ts`'s existing `isRecord(input) && Array.isArray(input.records)` guard before calling the helper. The helper must not invoke either host-config schema and must not throw on an individual primitive/array child.
- Keep `HostConfigDocumentSchemaV2.parse`, `HostConfigDocumentSchema.parse`, mutation branding/deep-freezing, and `sameJson` in their current callers. The deliberately broad `Record<string, unknown>` result documents that the shared operation returns an unvalidated projection, not a generated boundary contract.
- Keep the installed-user and project-local branches in `parseRoot` and `compatibleDocumentEqual` byte-for-byte unchanged. The coordinator's old array-spread behavior need not be reproduced because `validateSnapshot` rejects array host-config children before comparison; codec semantics control the helper's tolerant child predicate.
- Preserve root and record spread order so strict migration/encoding produces the same v2 JSON value and tolerant decoding retains unknown fields long enough for the current corruption decision.
- Extend the existing state-contract assertion to inspect the projected `config` defaults. Add one focused coordinator case with a non-empty v1 adapter config and the corresponding verified v2 mutation only if needed to make adapter-envelope compatibility non-vacuous; do not add a broad new test matrix. Existing strict-migration and malformed-sibling codec tests remain the primary policy and isolation proofs.

**Acceptance Criteria**:

- [ ] Exactly one implementation of the host-config compatibility constants remains under `src/`: `schemaVersion: 2`, refresh zero defaults, and empty notifications are emitted by `projectHostConfigV1ToV2`; the four named callers invoke it.
- [ ] `migrateVersionedDocument(HostConfigSchemaFamily, v1)` returns the same v2 value for remote records and still maps accepted `local-git` + `automatic` v1 records to `manual`.
- [ ] `decodeStateDocument("hostConfig", ...)` still retains valid siblings, quarantines identifiable malformed object records, and keeps enclosing-document-fatal behavior for unidentifiable records, unsupported versions, generation mismatches, and digest mismatches.
- [ ] `parseStateMutation` still strictly rejects invalid v1 replacements, emits v2 host-config defaults for valid v1 replacements, deep-freezes the result, and produces the only WeakSet-verified mutation accepted by the store port.
- [ ] Commit reconciliation still recognizes a v1 host-config adapter envelope as equivalent to the expected v2 mutation for non-empty records and still rejects unrelated expected-plus-one evidence.
- [ ] Installed-user and project-local migration/proof behavior is unchanged.
- [ ] `src/index.ts`, package schemas, default values, and the compiled/public export allowlists remain unchanged at 434 exports.
- [ ] Focused tests pass: `test/domain/state/config-state.test.ts`, `test/domain/state/codec.test.ts`, `test/application/state-contract.test.ts`, and `test/application/generation-mutation-coordinator.test.ts`.
- [ ] Full baseline remains green: 117 test files / 636 tests, `npm run typecheck`, `npm run boundaries`, `npm run build`, package import/export verification, and 434 exports (test totals may increase only for the one focused non-vacuous compatibility case).

**Risk**:

Medium. The helper intentionally accepts partially malformed children for the tolerant codec and raw adapter evidence for commit proof. Accidentally adding schema parsing, omitting non-object entries, normalizing local-source policy globally, or exporting the helper publicly would alter corruption isolation or compatibility guarantees.

**Rollback**: Revert the single implementation commit for this checkpoint, restoring the four local projections together. There is no persisted-data migration, schema change, or public API transition to unwind.

## Implementation Order

1. Implement `centralize-host-config-v2-compatibility-projection-step-1` as one cohesive change: add the domain helper, preserve strict-only local-source normalization, switch all four callers, apply the minimal focused assertions, then run focused and full verification.

## Atomicity and Rollback

This is an atomic source refactor even though each caller remains independently testable: the value comes from making one operation authoritative across all four paths. Land the helper and all caller substitutions in one implementation commit. If any boundary diverges, revert that commit as a unit; no state files have been rewritten and both v1 and v2 schemas remain unchanged.

## Dependency Check

`work-view --blocking centralize-host-config-v2-compatibility-projection` and `work-view --parent centralize-host-config-v2-compatibility-projection` returned no blockers or existing children before story creation. The sole child has `depends_on: []`, so it introduces no dependency edge and no cycle.

## Integrated implementation verification
- Child checkpoint `centralize-host-config-v2-compatibility-projection-step-1` is complete at `stage: done`; implementation commit: `0b55ad4`.
- The domain-owned projection is the single host-config v1→v2 shape implementation and is used by strict migration, tolerant codec parsing, verified mutation construction, and commit-evidence comparison. Strict local-git policy normalization and all boundary-specific validation remain local.
- Focused suites passed: 26 tests across config-state, codec, state-contract, and generation-mutation-coordinator coverage.
- Full verification passed: 117 test files / 637 tests, typecheck, dependency boundaries, build, compiled package import, and 434 exports.
- No public exports, schemas, defaults, installed-user/project-local compatibility paths, or update-policy behavior changed.
- No deviations or blockers remain. The isolated worktree had no dependency directory, so verification used a temporary symlink to the existing repository dependencies; it was removed before commit.

## Review (2026-07-16)

**Weight**: standard — one independent fresh-context Umans GLM 5.2 pass
**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none
**Rejected**: none

The reviewer verified the helper is shape-only, strict local-source normalization remains local, tolerant corruption isolation is preserved, verified mutations remain strict/frozen/branded, v1 adapter evidence remains non-vacuously comparable, and package exports remain unchanged. Reproduced focused 26 tests, full 117 files / 637 tests, typecheck, 177-module dependency boundaries, build/package import, and 434 exports.
