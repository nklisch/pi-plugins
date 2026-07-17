---
id: prune-dead-marketplace-contract-seams
kind: feature
stage: implementing
tags: [refactor]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Prune Dead Marketplace Contract Seams

## Brief

Delete three unused internal marketplace contract declarations left behind by refresh and catalog evolution: `MarketplacePluginProbe`, `MarketplaceSnapshotRead`, and `ResolvedMarketplaceCandidateResultSchema`. Keep the live refresh probe port/result, catalog resolver type/service, package exports, and every runtime behavior unchanged.

## Discovery Scope

Direct-read discovery covered the five requested stories and commits `5d0521b..db76137`: source/foreign boundaries, registration service, refresh/status, adoption preview/import, and catalog query. The scan read their application, infrastructure, contract, and focused test surfaces. Later packaged composition/integration (`5c7bcc9`, `663c285`, and `b03546d`) and the active inspection design were read only to reject overlap. Foundation documents, project rules/conventions, prior refactor history, active/backlog items, repository-wide references, package barrels, and compiled/public export checks were examined. No nested agent, peer mechanism, or `.work/bin/work-view` invocation was used.

No project refactor-conventions or reusable pattern catalog exists. Repository-wide exact-symbol searches found each target declaration only at its definition. None is re-exported from `src/index.ts` or `src/pi/index.ts`, listed in public/compiled allowlists, referenced by tests or foundation docs, or named by active inspection design. A tracked-work search found no existing item or reference for this feature/story ID. Both new items have empty `depends_on`; the child points only to this feature, so the manually checked graph is acyclic.

## Refactor Overview

`update-contract.ts` still declares two types from an earlier refresh design:

- `MarketplacePluginProbe` is unused and has been superseded by the live `MarketplacePluginProbeResult`/`MarketplacePluginProbePort` owned by `marketplace-refresh-service.ts` and consumed by `marketplace-plugin-probe.ts` plus composition.
- `MarketplaceSnapshotRead` has no caller, implementation, schema, or package export.

`marketplace-catalog-contract.ts` declares `ResolvedMarketplaceCandidateResultSchema`, but the internal resolver deliberately returns the branded, deep-frozen `ResolvedMarketplaceCandidateResult` TypeScript contract from `marketplace-catalog-service.ts`. No boundary parses with the loose passthrough schema, and it is not package-public. Keeping it suggests a second runtime authority that does not exist.

Removing the three declarations also removes their now-unused type-only imports. No replacement abstraction is needed.

## Refactor Steps

### Step 1: Delete unused refresh and catalog declarations

**Priority**: Medium

**Risk**: Low

**Source Lens**: elimination / dead weight / confused contract ownership / code economy
**Files**: `src/application/update-contract.ts`, `src/application/marketplace-catalog-contract.ts`

**Story**: `prune-dead-marketplace-contract-seams-step-1`

**Current State**:

```ts
// update-contract.ts — no imports or consumers anywhere in src/ or test/
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

// marketplace-catalog-contract.ts — no parser call, import, test, or barrel export
export const ResolvedMarketplaceCandidateResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("resolved") }).passthrough().readonly(),
  z.object({ kind: z.enum(["candidate-stale", "candidate-missing", "catalog-unavailable"]) }).strict().readonly(),
]);
```

**Target State**:

```ts
// The dead declarations are absent.
// update-contract.ts retains live refresh request/result/outcome/notification schemas and exports.
// marketplace-catalog-contract.ts retains serializable search/detail schemas and errors.
// marketplace-catalog-service.ts retains the internal branded resolver result type and behavior.
```

**Implementation Notes**:

- Delete only the three declarations and type-only imports made unused by them: `NormalizedMarketplaceEntry` and `MarketplaceUpdateRecord`.
- Keep `MarketplacePluginProbeResult` and `MarketplacePluginProbePort` in `marketplace-refresh-service.ts`; these are the live probe contract used by `marketplace-plugin-probe.ts`, composition, and the root package type exports.
- Keep `ResolvedMarketplaceCandidate`, `ResolvedMarketplaceCandidateResult`, and `MarketplaceCatalogService.resolve()` in `marketplace-catalog-service.ts`. Active inspection consumes that exact internal capability, not the dead passthrough schema.
- Keep `MarketplaceReadResultSchema`, `MarketplaceRefreshOutcomeSchema`, `MarketplaceCandidateDetailResultSchema`, and every current compatibility/public export.
- Do not rename, move, consolidate, or alter a live schema/type. Do not add a deprecation alias: the targets have no supported package path or consumer to migrate.
- Do not touch tests unless an existing static export assertion unexpectedly proves one target public; if that happens, stop rather than converting this into a public API change.

**Acceptance Criteria**:

- [ ] Exact repository search finds no `MarketplacePluginProbe`, `MarketplaceSnapshotRead`, or `ResolvedMarketplaceCandidateResultSchema` declaration or reference.
- [ ] `update-contract.ts` no longer imports `NormalizedMarketplaceEntry` or the `MarketplaceUpdateRecord` type solely for dead declarations.
- [ ] The live marketplace probe implementation, port/result types, automatic-update behavior, and composition wiring are unchanged.
- [ ] Catalog search/detail schemas and the branded exact resolver service/type are unchanged; active inspection design retains its existing consumer seam.
- [ ] `src/index.ts`, `src/pi/index.ts`, public API allowlists, compiled export counts, and emitted package surface are unchanged.
- [ ] The implementation is a strict net deletion and contains no replacement abstraction, compatibility shim, test cleanup, or behavior change.
- [ ] Typecheck, dependency boundaries, focused refresh/catalog tests, public API tests, build, and compiled package verification pass.

**Rollback**: Revert the implementation commit to restore the three unused declarations and type imports. No runtime, persisted state, schema family, migration, or supported package contract is involved.

## Candidate Disposition

- **Accepted** — Three exact-symbol dead seams across refresh/catalog contracts. Each exists only at its definition, none is package-public, and live replacement ownership is already established. Deletion is behavior-preserving and unambiguously reduces code.
- **Rejected** — Registration-ID and selected-snapshot lookup expressions recur across registration, refresh, state view, and catalog, but a helper would add imports and concepts for little or no whole-source net deletion.
- **Rejected** — `cacheWithoutIo` duplicates `initialCacheStatus`, promotion wrapping is duplicated between add/refresh, and scope equality is duplicated between registration/refresh; each occurs only twice in this cadence and is below the duplication-3 threshold.
- **Rejected** — Adoption `discover`/`adopt`, `MarketplaceRegistrationPort`, and their schemas are intentional package-public compatibility aliases. Removing them changes public API; merging old/new import loops would mix distinct cancellation and result contracts.
- **Rejected** — Local Git realpath validation appears at two different approval/acquisition boundaries. Consolidating it risks source/security policy and is outside scope.
- **Rejected** — Foreign provenance deduplication appears only in adoption and catalog and has different output/sort contracts.
- **Rejected** — Abort guards, deep-freeze helpers, and small state lookup wrappers would add imports or generic utilities without meaningful net deletion.
- **Rejected** — Splitting the large registration, refresh, catalog, adoption, foreign-file, or Git modules without a concrete deletion would move code rather than simplify it.
- **Rejected** — Marketplace review correctness/security, SSRF/source policy, atomic publication, state/schema changes, cursor semantics, test cleanup, public API changes, and active inspection design are expressly excluded.

## Exclusions

- No source or test implementation in this design pass.
- No correctness/security finding, guarantee change, state/schema migration, public export change, cursor/search semantic change, adoption change, or inspection integration.
- No unrelated item stage, release binding, push/release, or `.work/bin/work-view` change.

## Implementation Order

1. `prune-dead-marketplace-contract-seams-step-1`
