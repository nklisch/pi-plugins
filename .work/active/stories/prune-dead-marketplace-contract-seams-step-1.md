---
id: prune-dead-marketplace-contract-seams-step-1
kind: story
stage: implementing
tags: [refactor]
parent: prune-dead-marketplace-contract-seams
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Delete Unused Refresh and Catalog Declarations

## Value

**Priority:** Medium

**Risk:** Low

**Source lens:** elimination / dead weight / confused contract ownership / code economy

Three internal contract declarations have no import, parser call, test, package export, or active-design reference. Delete them and their exclusively used type imports rather than preserving false alternate contracts beside the live refresh probe and branded catalog resolver.

## Files

- `src/application/update-contract.ts`
- `src/application/marketplace-catalog-contract.ts`

## Current State

```ts
export type MarketplacePluginProbe = Readonly<{
  plugin: PluginKey;
  entry: NormalizedMarketplaceEntry;
  available: AvailableRevision;
  candidate: UpdateCandidateKey;
  display: Readonly<{ installed: string; available: string }>;
}>;

export type MarketplaceSnapshotRead = Readonly<{
  snapshot: MarketplaceSnapshotRecord;
  catalog: MarketplaceReadResult;
  record: MarketplaceUpdateRecord;
}>;

export const ResolvedMarketplaceCandidateResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolved") }).passthrough().readonly(),
  z.object({ kind: z.enum(["candidate-stale", "candidate-missing", "catalog-unavailable"]) }).strict().readonly(),
]);
```

Exact repository search finds each symbol only at this definition. None is exposed through the package export map/barrels or public/compiled allowlists.

## Target State

The declarations are absent. `update-contract.ts` retains only live refresh/update contracts. `marketplace-catalog-contract.ts` retains serializable search/detail contracts; `marketplace-catalog-service.ts` remains the sole owner of the internal branded resolver result and exact capability.

## Implementation Notes

- Delete the three declarations without a replacement alias or helper.
- Remove only the `NormalizedMarketplaceEntry` and `MarketplaceUpdateRecord` type imports that become unused.
- Preserve `MarketplacePluginProbeResult`, `MarketplacePluginProbePort`, `MarketplaceCatalogService.resolve()`, `ResolvedMarketplaceCandidate`, and `ResolvedMarketplaceCandidateResult` unchanged.
- Preserve all current request/result schemas, compatibility aliases, errors, package exports, and runtime behavior.
- Do not touch active inspection, refresh logic, catalog logic, state/schema, source policy, cursors, adoption, or tests except to stop if a static assertion disproves the dead/private classification.

## Acceptance Criteria

- [ ] The three dead symbols are absent repository-wide.
- [ ] Their exclusively used type imports are removed and no live import/export changes.
- [ ] The live refresh probe and branded catalog resolver contracts are unchanged.
- [ ] Root/Pi barrels and compiled/public export allowlists are unchanged.
- [ ] The source diff is deletion-only apart from import-list contraction.
- [ ] Focused refresh/catalog tests, typecheck, boundaries, public API checks, build, and package verification pass.

## Risk and Rollback

Risk is low because all three identifiers are unreferenced and not reachable through supported package exports. The only plausible hazard is an undocumented deep source-file consumer, which the package `exports` map does not support. Revert the implementation commit to restore the declarations; no migration or compatibility path is required.
