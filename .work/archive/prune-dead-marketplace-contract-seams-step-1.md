---
id: prune-dead-marketplace-contract-seams-step-1
kind: story
stage: done
tags: [refactor]
parent: prune-dead-marketplace-contract-seams
depends_on: []
release_binding: 0.1.0
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
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

- [x] The three dead symbols are absent from source, tests, and compiled output.
- [x] Their exclusively used type imports are removed and no live import/export changes.
- [x] The live refresh probe and branded catalog resolver contracts are unchanged.
- [x] Root/Pi barrels and compiled/public export allowlists are unchanged.
- [x] The source diff is deletion-only apart from import-list contraction.
- [x] Focused refresh/catalog tests, typecheck, boundaries, public API checks, build, and package verification pass.

## Risk and Rollback

Risk is low because all three identifiers are unreferenced and not reachable through supported package exports. The only plausible hazard is an undocumented deep source-file consumer, which the package `exports` map does not support. Revert the implementation commit to restore the declarations; no migration or compatibility path is required.

## Implementation notes

- Execution capability: direct inline implementation; the change was a bounded two-file deletion with no unresolved integration questions, and the caller prohibited nested agents.
- Review weight: standard by project default; not applicable to this child-story checkpoint, which advances directly to done after green verification.
- Files changed: `src/application/update-contract.ts`, `src/application/marketplace-catalog-contract.ts`.
- Tests added/removed: none; the removed declarations had no consumers, and existing contract, behavior, public API, and compiled-package tests cover the retained seams.
- Simplification: removed exactly the three designed dead declarations and their two exclusively supporting type imports. Source delta: 1 insertion, 21 deletions, net 20 lines deleted across 2 files; the sole insertion is the contracted import line.
- Consumer verification: exact-symbol searches found no remaining source, test, emitted declaration, root/Pi barrel, public allowlist, compiled allowlist, dynamic loader, package export-map, or active inspection consumer. The live `MarketplacePluginProbeResult`/`MarketplacePluginProbePort` and branded `ResolvedMarketplaceCandidate`/`ResolvedMarketplaceCandidateResult` declarations remain emitted unchanged.
- Verification: focused Vitest passed 5 files / 18 tests with no type errors. Full `npm test` passed typecheck; dependency boundaries (285 modules / 1,855 dependencies, zero violations); 214 files / 1,068 tests with no type errors; build; compiled root package (562 exports); compiled Pi package (3 exports); and isolated packed Pi startup.
- Commit: implementation and story completion are recorded by this story's `implement: prune-dead-marketplace-contract-seams-step-1` commit.
- Discrepancies from design: none.
- Adjacent issues parked: none.
