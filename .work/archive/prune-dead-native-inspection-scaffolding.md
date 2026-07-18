---
id: prune-dead-native-inspection-scaffolding
kind: feature
stage: done
tags: [refactor, compatibility]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Prune Dead Native Inspection Scaffolding

## Brief

Delete one unreferenced component-projection helper and four unused schema imports left by the first native inspection contracts and safe-disclosure implementation. Keep the active local projection helper, all inspection schemas, identifiers, display/redaction behavior, snapshot evidence, and package exports unchanged.

## Discovery Scope

Direct-read discovery covered the requested cadence only:

- marketplace packaged composition `5c7bcc9` and integrated acceptance `663c285`;
- native inspection contracts/identifiers `17a5708`, safe display/disclosure `2ae186f`, and snapshot evidence through `36c28a7`.

Later inspection commits through current `HEAD` (`61b9cff`) were read only to verify that findings still exist and do not overlap later ownership/correctness work. The scan also checked foundation documents, project rules/conventions, prior refactor history, active/backlog items, exact source/test references, and current package barrels. It did not inspect trusted-install work as a candidate source. No nested agent, peer mechanism, or `.work/bin/work-view` invocation was used.

No project refactor-conventions or reusable pattern catalog exists. Exact-symbol searches find `componentBase` only at its definition, while each targeted schema symbol occurs exactly once in `native-inspection-contract.ts`, at its import. Neither new item ID exists or appears in a dependency list. The feature and child both have empty `depends_on`, so the manually checked graph is acyclic.

## Refactor Overview

`native-inspection-disclosure.ts` contains two byte-for-byte equivalent component-base projectors. The module-level `componentBase` is never called; `projectSafeComponents` builds and uses a closure named `base` over its already-parsed compatibility assessment map. The outer helper therefore suggests a second projection path without owning any behavior.

`native-inspection-contract.ts` also imports `MarketplaceNameSchema`, `MarketplaceCandidateIdSchema`, `MarketplaceRegistrationIdSchema`, and `MarketplaceSnapshotTokenSchema` without using them. The live contract uses `PluginKeySchema` and `MarketplaceScopeSelectionSchema`; identifier payload schemas own the other marketplace identifier contracts.

One deletion step removes these five dead artifacts with no replacement abstraction.

## Refactor Steps

### Step 1: Delete unused inspection projection scaffolding

**Priority**: Medium

**Risk**: Low

**Source Lens**: elimination / dead weight / confused ownership / code economy

**Files**: `src/application/native-inspection-contract.ts`, `src/application/native-inspection-disclosure.ts`

**Story**: `prune-dead-native-inspection-scaffolding-step-1`

**Current State**:

```ts
// native-inspection-contract.ts — each removed name appears only here
import { MarketplaceNameSchema, PluginKeySchema } from "../domain/identity.js";
import {
  MarketplaceCandidateIdSchema,
  MarketplaceRegistrationIdSchema,
  MarketplaceScopeSelectionSchema,
  MarketplaceSnapshotTokenSchema,
} from "../domain/marketplace-registration.js";

// native-inspection-disclosure.ts — no caller in src/ or test/
function componentBase(component: { id: string }, report: CompatibilityReport | undefined, provenance: readonly Provenance[]) {
  const assessment = assessmentMap(report).get(component.id as never);
  return {
    componentId: component.id,
    verdict: assessment?.verdict.kind ?? "unavailable",
    requirementIds: assessment?.requirementIds ?? [],
    provenance: projectSafeProvenance(provenance),
  };
}

// The live implementation separately declares and uses this closure.
const assessments = assessmentMap(compatibility);
const base = (component: { id: string }, provenance: readonly Provenance[]) => {
  // same projection, used by every component variant
};
```

**Target State**:

```ts
// native-inspection-contract.ts retains only the schemas it uses.
import { PluginKeySchema } from "../domain/identity.js";
import { MarketplaceScopeSelectionSchema } from "../domain/marketplace-registration.js";

// native-inspection-disclosure.ts retains the live assessmentMap and local
// base closure inside projectSafeComponents; the unused outer helper is absent.
```

**Implementation Notes**:

- Delete only the four unused imports and the unreferenced `componentBase` declaration.
- Keep `assessmentMap` and the local `base` closure exactly as they are; they avoid rebuilding the assessment map for each component and are the sole live projection path.
- Keep all Zod schemas, inferred public types, identifier codecs, display/redaction helpers, snapshot evidence, diagnostic registry behavior, and root exports unchanged.
- Do not consolidate canonical serializers, scope equality, revalidation wrappers, or safe-display logic in this step.
- Do not modify tests. Existing typecheck and focused inspection suites are proportionate evidence for declaration-only deletion.

**Acceptance Criteria**:

- [ ] Exact source/test searches find no `componentBase` declaration or reference.
- [ ] `native-inspection-contract.ts` no longer imports the four unused marketplace schemas; `PluginKeySchema` and `MarketplaceScopeSelectionSchema` remain.
- [ ] `projectSafeComponents` retains one live local component-base projector and the same parsed assessment-map reuse.
- [ ] Native inspection schemas, public exports, identifier bytes, display/redaction output, diagnostic output, snapshot authority, and runtime behavior are unchanged.
- [ ] The implementation is a strict net deletion with no replacement abstraction, compatibility alias, source move, or test change.
- [ ] Typecheck and focused native inspection contract/disclosure suites pass; package export verification remains unchanged if the implementation runner performs the full project check.

**Rollback**: Revert the implementation commit to restore the unused declaration and imports. No runtime, persisted state, snapshot binding, package contract, or supported behavior is involved.

## Candidate Disposition

- **Accepted** — `componentBase` in `src/application/native-inspection-disclosure.ts:150-158` is definition-only and duplicates the live local `base` closure in the same module. Removing it eliminates a false second owner and nine dead source lines.
- **Accepted as fallout in the same step** — four schema imports in `src/application/native-inspection-contract.ts:6-12` are each import-only. Removing them makes contract dependencies truthful without changing a schema.
- **Rejected** — canonical serialization/equality recurs in inspection identifiers, snapshot evidence, diagnostic compilation, and runtime selection. Consolidation would enter snapshot/digest authority, and the local serializers have intentionally different validation/order semantics; the caller excluded snapshot authority changes.
- **Rejected** — marketplace revalidation wrappers recur across registration, refresh, policy, catalog, and adoption. A generic forwarding abstraction would add callback/type machinery, touch the public capability boundary, and does not offer convincing net deletion.
- **Rejected** — current-project/trust optional spreads recur three times in marketplace composition, but extracting a bag would save little code while obscuring which constructor accepts which authority.
- **Rejected** — `createPackagedPluginHost` is large, but broad splitting would move lifetime composition rather than eliminate concepts and is explicitly excluded.
- **Rejected** — integration test setup repeats across clean-environment/restart/concurrency/security files, but test refactors and test cleanup are explicitly excluded.
- **Rejected** — safe-display, URL redaction, corruption evidence, catalog publication checks, stale snapshot behavior, runtime evidence, and later inspection changes are correctness/security/snapshot-authority work, not conservative refactors for this cadence.
- **Rejected** — removing or reshaping public schemas, inferred view types, factories, aliases, or root exports would change the supported package surface.
- **Rejected** — atomic publication, review findings, trusted installation, and unrelated active/backlog work are outside this cadence.

## Exclusions

- No source or test implementation in this design pass.
- No correctness, security, redaction, snapshot/digest authority, atomic publication, runtime selection, state/schema, public view/schema/export, or trusted-install change.
- No test creation, deletion, assertion rewrite, or broad source splitting.
- No unrelated item transition, `.work/bin/work-view` invocation/change, release binding, push, or release work.

## Implementation Order

1. `prune-dead-native-inspection-scaffolding-step-1`

## Implementation notes

- Execution capability: direct-read inline implementation; exact source, test, barrel-export, and dynamic-import searches fully bounded the two-file deletion. No nested agent was used.
- Review weight: standard by project default; caller requested the feature stop at `stage: review`.
- Child checkpoint: `prune-dead-native-inspection-scaffolding-step-1` advanced directly to `stage: done` in commit `9dff9a6`.
- Files changed: `src/application/native-inspection-contract.ts`, `src/application/native-inspection-disclosure.ts`, the child story record, and this feature record.
- Tests added/removed: none; all inspection behavior, redaction, snapshots, contracts, and package checks remain unchanged.
- Simplification: production source is 15 net lines smaller (2 insertions, 17 deletions from import reformatting and helper removal), with no replacement abstraction, alias, source move, or test change.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Integrated verification

- Exact searches found no `componentBase` in source/tests and none of the four removed schema bindings in `native-inspection-contract.ts`.
- Runtime/type/public/export/dynamic inspection found no consumer: `componentBase` was private and definition-only; the four schemas remain owned and publicly exported from their existing domain modules/root barrel.
- `projectSafeComponents` still creates one assessment map and uses its unchanged local `base` closure for all four component variants.
- Focused unchanged suites passed: 2 files, 7 tests, no type errors.
- Full `npm test` passed: typecheck; dependency boundaries (302 modules, 2,044 dependencies); 233 test files and 1,145 tests; package checks with 623 root exports, 3 Pi exports, and isolated packed extension startup.

## Review

- Review weight: standard; exactly one independent GPT-5.6 pass.
- Verdict: **APPROVE** with no blockers or parked findings.
- Confirmed private helper and schema bindings were definition/import-only, live projection is unchanged, owning imports remain loaded, generated declarations are identical, and public exports are unchanged.
- No fixes or repeat review were needed. Feature advanced `review → done`.
