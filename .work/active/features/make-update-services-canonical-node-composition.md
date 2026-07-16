---
id: make-update-services-canonical-node-composition
kind: feature
stage: drafting
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

# Make Update Services the Canonical Node Composition

## Brief

The new update-named Node composition is documented as the complete update surface, but it is only a wrapper around the older refresh-named implementation. Invert that private ownership: let the update module own policy, refresh, scheduler, and Node delay composition, while the refresh-named factory remains a true compatibility alias. Preserve every public symbol and runtime result.

## Discovery Evidence

**Value:** Medium  
**Source lenses:** organization / naming and data flow / elimination  
**Discovery posture:** direct-read scan of changed composition, package barrel, and public/compiled API tests; no subagents.

- `src/composition/create-marketplace-update-services.ts:1-21` says the refresh-named factory “remains as a compatibility alias,” but `createNodeMarketplaceUpdateServices` delegates to `createNodeMarketplaceRefreshServices` and aliases its types. The implementation ownership is therefore the reverse of the stated and current domain boundary.
- `src/composition/create-marketplace-refresh-services.ts:1-55` now composes update preference policy in addition to refresh and scheduling, so its filename and primary type names no longer describe the complete service it owns.
- `src/index.ts:1035-1045`, `test/public-api.test.ts`, and `test/compiled-package-import.mjs` prove both names are supported public contracts. Removing or renaming either is rejected; only private implementation direction should change.

## Current State

```typescript
// create-marketplace-refresh-services.ts owns the full implementation.
export function createNodeMarketplaceRefreshServices(options: NodeMarketplaceRefreshServicesOptions) {
  const refresh = createMarketplaceRefreshService(options.refresh);
  const policy = createMarketplaceUpdatePolicyService(/* ... */);
  const scheduler = createMarketplaceUpdateScheduler(/* ... */);
  return Object.freeze({ refresh, policy, scheduler });
}

// create-marketplace-update-services.ts is the nominally canonical wrapper.
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceRefreshServices(options);
}
```

## Target State

- Move the complete implementation and canonical `NodeMarketplaceUpdateServicesOptions` / `NodeMarketplaceUpdateServices` types into `src/composition/create-marketplace-update-services.ts`.
- Make `createNodeMarketplaceRefreshServices` delegate to the update-named factory, with compatibility type aliases preserving `NodeMarketplaceRefreshServicesOptions` and `NodeMarketplaceRefreshServices`.
- Keep both direct module paths and every `src/index.ts` export intact. The two factories must still return the same frozen `{ refresh, policy, scheduler }` shape and perform no I/O or timer work during construction.
- Avoid a module cycle: the compatibility module imports the canonical module in one direction only.

Illustrative target:

```typescript
// create-marketplace-update-services.ts
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceUpdateServicesOptions,
): NodeMarketplaceUpdateServices {
  // existing full composition, unchanged
}

// create-marketplace-refresh-services.ts
export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceUpdateServices(options);
}
export type {
  NodeMarketplaceUpdateServicesOptions as NodeMarketplaceRefreshServicesOptions,
  NodeMarketplaceUpdateServices as NodeMarketplaceRefreshServices,
};
```

## Constraints and Rejections

- Pure refactor only: no public export removal/rename, no constructor timing change, no scheduler start, no default-policy change, and no new dependency or option.
- Preserve direct imports from both composition modules, not only the package barrel.
- Do not remove the old refresh-named API; compatibility pruning would be a public-contract decision.
- Do not combine the separate duplicated state-projection finding into this item; the write sets and rollback boundaries are independent.

## Risk

**Low.** The primary hazards are an accidental circular import, type-only alias regression, changed package export identity, or construction side effect. All are detectable through import graph, typecheck, and existing API/composition tests.

**Rollback:** revert the ownership inversion so the update module delegates to the refresh module again. No state or runtime migration exists.

## Verification

- Extend the existing construction test to instantiate both factory names and prove neither starts refresh, policy, timer, state, or materialization work.
- Existing scheduler/composition tests pass unchanged.
- `test/public-api.test.ts` and `test/compiled-package-import.mjs` retain both factory names and all four service/option type contracts; compiled export count is unchanged.
- Dependency search confirms one full Node marketplace-update composition and one one-line compatibility delegation, with no module cycle.
- `npm run typecheck`, `npm run boundaries`, `npm run build`, and package import verification pass.

## Dependency Check

Independent discovery finding. `depends_on: []`; it has no required ordering relative to the update-record state-projection finding and introduces no dependency edge or cycle.
