---
id: prune-dead-native-inspection-scaffolding-step-1
kind: story
stage: implementing
tags: [refactor, compatibility]
parent: prune-dead-native-inspection-scaffolding
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
