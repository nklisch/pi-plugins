---
id: prune-dead-native-inspection-scaffolding-step-1
kind: story
stage: done
tags: [refactor, compatibility]
parent: prune-dead-native-inspection-scaffolding
depends_on: []
release_binding: 0.1.0
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Delete Unused Inspection Projection Scaffolding

## Value

**Priority:** Medium

**Risk:** Low

**Source lens:** elimination / dead weight / confused ownership / code economy

Remove a definition-only component projection helper and four import-only schema names. The live local projector, every inspection contract, and all observable inspection behavior remain unchanged.

## Files

- `src/application/native-inspection-contract.ts`
- `src/application/native-inspection-disclosure.ts`

## Current State

```ts
// native-inspection-contract.ts
import { MarketplaceNameSchema, PluginKeySchema } from "../domain/identity.js";
import {
  MarketplaceCandidateIdSchema,
  MarketplaceRegistrationIdSchema,
  MarketplaceScopeSelectionSchema,
  MarketplaceSnapshotTokenSchema,
} from "../domain/marketplace-registration.js";

// native-inspection-disclosure.ts
function componentBase(component: { id: string }, report: CompatibilityReport | undefined, provenance: readonly Provenance[]) {
  const assessment = assessmentMap(report).get(component.id as never);
  return {
    componentId: component.id,
    verdict: assessment?.verdict.kind ?? "unavailable",
    requirementIds: assessment?.requirementIds ?? [],
    provenance: projectSafeProvenance(provenance),
  };
}
```

Exact searches show the helper only at its definition and each removed schema symbol only at its import in the contract file. `projectSafeComponents` separately declares and uses its equivalent local `base` closure over one parsed assessment map.

## Target State

```ts
import { PluginKeySchema } from "../domain/identity.js";
import { MarketplaceScopeSelectionSchema } from "../domain/marketplace-registration.js";

// The dead outer componentBase helper is absent. assessmentMap and the live
// local base closure in projectSafeComponents remain unchanged.
```

## Implementation Notes

- Re-run exact reference searches before deletion.
- Remove only `MarketplaceNameSchema`, `MarketplaceCandidateIdSchema`, `MarketplaceRegistrationIdSchema`, `MarketplaceSnapshotTokenSchema`, and the outer `componentBase` function.
- Preserve `assessmentMap`, the local `base` closure, all schema definitions, identifier/display/disclosure logic, snapshot evidence, and exports byte-for-byte outside import formatting.
- Do not touch tests; no deleted declaration has a caller or behavior requiring a replacement test.
- Stop rather than widening the step if verification reveals a dynamic/public consumer.

## Acceptance Criteria

- [ ] No `componentBase` symbol remains in source or tests.
- [ ] Each removed schema name is absent from `native-inspection-contract.ts`; its live imports remain.
- [ ] `projectSafeComponents` still builds one assessment map and uses its local base projection for skills, hooks, MCP servers, and foreign components.
- [ ] The source change is strict net deletion with no behavior, schema, export, snapshot, or test change.
- [ ] Typecheck passes.
- [ ] Focused native inspection contract and disclosure suites pass unchanged.

## Risk and Rollback

Risk is limited to overlooking an indirect reference, bounded by exact repository search and typecheck. Revert the implementation commit to restore the unused helper/imports; no persisted or public contract migration is involved.

## Implementation notes

- Execution capability: direct-read inline implementation; the two named files and exact-symbol searches fully bounded the low-risk deletion, with no nested agent used.
- Review weight: standard by project default; not applicable to this child-story checkpoint, which advances directly to done after green verification.
- Files changed: `src/application/native-inspection-contract.ts`, `src/application/native-inspection-disclosure.ts`, and this story record.
- Tests added/removed: none; the deleted declarations had no runtime, type, public-export, dynamic-import, or test consumers.
- Simplification: removed the unused outer `componentBase` helper and four import-only schema bindings with no replacement abstraction; production source is 15 net lines smaller (2 insertions, 17 deletions from import reformatting and helper removal).
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence

- Exact source/test searches found no remaining `componentBase` symbol and no targeted removed schema name in `native-inspection-contract.ts`.
- Public/export and dynamic-consumer inspection confirmed that the schemas remain defined and exported from their owning domain modules/root barrel, while `componentBase` was never exported; no contract surface changed.
- The live `projectSafeComponents` path still builds one parsed assessment map and invokes its local `base` projector for skills, hooks, MCP servers, and foreign components.
- Focused unchanged suites: 2 files passed, 7 tests passed, no type errors.
- Full `npm test`: typecheck passed; dependency boundaries passed (302 modules, 2,044 dependencies); 233 test files and 1,145 tests passed with no type errors; package build/import checks passed (623 root exports, 3 Pi exports, isolated packed extension startup).
