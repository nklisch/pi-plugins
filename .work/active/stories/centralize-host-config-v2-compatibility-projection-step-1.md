---
id: centralize-host-config-v2-compatibility-projection-step-1
kind: story
stage: done
tags: [refactor, infra]
parent: centralize-host-config-v2-compatibility-projection
depends_on: []
release_binding: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Extract and Adopt the Host-Config v1→v2 Shape Projection

## Checkpoint

Centralize the deterministic host-config compatibility shape in `src/domain/state/config-state.ts` and route strict migration, tolerant decoding, verified mutation construction, and commit-evidence comparison through it. This is one atomic implementation checkpoint: do not split ownership by caller.

## Current State

Four boundaries independently emit the same `schemaVersion: 2`, refresh-zero, and empty-notifications shape:

- `src/domain/state/config-state.ts:53-65`
- `src/domain/state/codec.ts:269-284`
- `src/application/state-contract.ts:275-279`
- `src/application/generation-mutation-coordinator.ts:333-343`

They do not share validation semantics. Strict migration parses the complete v1 and v2 documents and normalizes `local-git` automatic policy to manual. The codec preserves malformed children for record-level quarantine. Mutation verification strictly parses and brands its replacement. Commit proof compares v1 adapter evidence with expected v2 evidence without treating projection as validation, after `validateSnapshot` has strictly accepted the adapter envelope. Its current local object check would spread an array child while the codec preserves arrays, but array children cannot pass that envelope validation; the difference is unreachable for accepted values.

## Target State

Add this internal-module operation to `src/domain/state/config-state.ts`:

```typescript
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
```

Adopt it at all four call sites:

```typescript
// Registered strict migration: normalize its existing caller-specific policy first.
const normalized = {
  ...value,
  records: value.records.map((record) => ({
    ...record,
    updateApplication: record.source.kind === "local-git" ? "manual" : record.updateApplication,
  })),
};
return HostConfigDocumentSchemaV2.parse(projectHostConfigV1ToV2(normalized));

// Tolerant codec, after its existing root guards.
candidate = projectHostConfigV1ToV2(input);

// Verified mutation construction, inside its existing strict parse.
replace.config.schemaVersion === 1
  ? projectHostConfigV1ToV2(replace.config)
  : replace.config

// Commit-evidence comparison, after its existing v1/v2 and array guards.
return sameJson(projectHostConfigV1ToV2(actualRecord), expectedRecord);
```

Do not add the helper to `src/index.ts`; the package export contract stays unchanged.

## Implementation Notes

- The helper owns shape only. It must not call Zod, `createMarketplaceConfigurationRecord`, mutation branding, or `sameJson`.
- Preserve unknown root/record fields and preserve non-object child entries. The codec needs those values intact to make the same fatal-versus-quarantine decisions after projection.
- Keep strict-only `local-git` policy normalization in `migrateHostV1`; moving it into the helper would make tolerant decoding accept a record it currently quarantines and would weaken mutation/proof strictness.
- Keep existing root guards in `codec.ts`, strict v2 parses in `config-state.ts` and `state-contract.ts`, and envelope guards in `generation-mutation-coordinator.ts`. The helper's broad `Record<string, unknown>` result intentionally advertises an unvalidated projection.
- Use the codec-safe predicate that excludes arrays. This preserves the only caller that can receive malformed children and does not alter coordinator behavior for accepted, schema-validated adapter envelopes.
- Leave installed-user/project-local projections, schemas, defaults, public exports, and migration behavior untouched.
- Extend the existing `state-contract` assertion to prove projected config defaults. Add at most one focused non-empty-record coordinator compatibility case if the existing empty-record reconciliation does not prove the adapter path meaningfully.

## Acceptance Criteria

- [ ] A source search finds one host-config v1→v2 compatibility-shape implementation and four uses of `projectHostConfigV1ToV2`.
- [ ] Strict migration produces the same v2 JSON value for all accepted v1 values, including `local-git` + `automatic` becoming `manual`.
- [ ] Mixed host-config records retain valid siblings and the same record-level corruption codes; unidentifiable records remain document-fatal.
- [ ] Verified mutation parsing remains strict, frozen, WeakSet-branded, and default-equivalent for valid v1 config input.
- [ ] Commit proof remains compatible with non-empty v1 adapter envelopes and rejects unrelated writes.
- [ ] No `src/index.ts`, schema, installed-user, project-local, default, or public-export changes occur.
- [ ] Focused tests pass for config-state, codec, state-contract, and generation-mutation-coordinator.
- [ ] Full verification passes: 117 baseline files / 636 baseline tests (plus at most one focused case), typecheck, dependency boundaries, build/package import, and 434 exports.

## Priority and Risk

**Priority:** High  
**Risk:** Medium  
**Source lens:** missing abstraction / single source of truth

The tolerant raw-input contract is the main risk: validation added to the helper would turn record corruption into whole-document failure, while policy normalization added there would alter accepted values at other boundaries.

## Rollback

Revert this checkpoint's implementation commit as a unit. The work changes no persisted data, schemas, public API, or generation format, so rollback requires no migration or cleanup.

## Atomicity

The helper and all four substitutions land together. Partial adoption is behaviorally safe but fails the single-source-of-truth objective and creates an unnecessary mixed-policy state; it is not a useful implementation boundary.

## Implementation notes
- Execution capability: direct-read inline implementation; the design named four bounded call sites and this isolated checkpoint forbade delegation.
- Review weight: standard, from project convention; this child checkpoint advances directly to done without parent review.
- Files changed: `src/domain/state/config-state.ts`, `src/domain/state/codec.ts`, `src/application/state-contract.ts`, `src/application/generation-mutation-coordinator.ts`, and the four focused test suites.
- Tests added/removed: extended migration and mutation assertions; added one non-empty v1 adapter-envelope proof case for commit reconciliation.
- Simplification: centralized the deterministic host-config projection and removed the unused strict migration record-constructor import; caller-specific validation, policy normalization, quarantine, branding, and proof remain local.
- Discrepancies from design: TypeScript required narrow structural casts at the two tolerant/raw call sites because their existing `Record<string, unknown>` guards do not expose `records` as an array to the helper signature; runtime behavior is unchanged.
- Adjacent issues parked: none.
- Verification: focused suites passed (26 tests); full suite passed with 117 files and 637 tests; typecheck, dependency boundaries, build/package import passed; package export count remained 434.
