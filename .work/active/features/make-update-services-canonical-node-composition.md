---
id: make-update-services-canonical-node-composition
kind: feature
stage: review
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

## Design Decisions

- **Misroute check:** This remains a pure refactor. Both public factory names, all four public type names, direct module paths, barrel paths, validation result, frozen service shape, default delay behavior, and construction laziness remain unchanged. Only private implementation ownership and the one-way module edge invert.
- **Design posture:** Direct-read only, as required by the delegated endpoint and appropriate for two bounded composition files plus their existing public/compiled tests. The scan covered elimination, code smells, missing abstractions, pattern/naming drift, and dead weight; no project refactor-conventions catalog exists. No adjacent step had enough value to expand this item.
- **Compatibility form:** Retain a named refresh wrapper rather than directly re-exporting the update function. This preserves the existing distinct function objects and each function's `.name` while still making refresh a one-line compatibility delegation. Refresh option/result types become `=` aliases to the canonical update declarations, not copied structural definitions.
- **Public surface:** Keep `src/index.ts` and `test/compiled-package-import.mjs` unchanged. The exact runtime allowlist currently contains 437 exports, including each factory once; type aliases add no runtime keys.
- **Foundation timing:** No foundation edit. The intended architecture already places Node timer composition at the outer boundary and promises no startup-network dependency; this implementation ownership inversion makes naming match that truth without changing an assertion.
- **Execution shape:** One atomic implementation checkpoint. Splitting source movement from compatibility/test updates would leave an intermediate ownership cycle or an unprotected public boundary, so the complete inversion is one independently buildable, testable, and revertible story.

## Refactor Overview

The current implementation edge is `create-marketplace-update-services.ts` → `create-marketplace-refresh-services.ts`: the nominal canonical update factory imports and wraps the older refresh owner. Invert only that edge. The update module will own the private Node delay, canonical update option/result declarations, validation, refresh/policy/scheduler construction, and frozen result. The refresh module will import the update module, expose exact type aliases, and perform one-line delegation.

This removes the naming/ownership contradiction without introducing a helper, duplicate composition, migration, or new behavior. The existing error message remains exact even though it is refresh-named; changing observable validation text is outside this refactor.

## Refactor Steps

### Step 1: Invert Node update-composition ownership

**Priority:** Medium

**Risk:** Low

**Source Lens:** elimination / pattern drift / naming and data flow

**Files:** `src/composition/create-marketplace-update-services.ts`, `src/composition/create-marketplace-refresh-services.ts`, `test/application/marketplace-update-scheduler.test.ts`, `test/public-api.test.ts`

**Story:** `make-update-services-canonical-node-composition-step-1`

**Current State:**

```typescript
// create-marketplace-update-services.ts
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceRefreshServices(options);
}

// create-marketplace-refresh-services.ts owns nodeDelay, validation, and wiring.
export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  // Existing validation, then refresh + policy + scheduler construction.
  return Object.freeze({ refresh, policy, scheduler });
}
```

**Target State:**

```typescript
// create-marketplace-update-services.ts owns the unchanged implementation.
export type NodeMarketplaceUpdateServicesOptions = Readonly<{
  refresh: MarketplaceRefreshServiceDependencies;
  delay?: UpdateDelayPort;
}>;

export type NodeMarketplaceUpdateServices = Readonly<{
  refresh: MarketplaceRefreshService;
  policy: MarketplaceUpdatePolicyService;
  scheduler: MarketplaceUpdateScheduler;
}>;

export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceUpdateServicesOptions,
): NodeMarketplaceUpdateServices {
  if (options === null || typeof options !== "object" || options.refresh === undefined) {
    throw new TypeError("marketplace refresh composition requires refresh dependencies");
  }
  const refresh = createMarketplaceRefreshService(options.refresh);
  const policy = createMarketplaceUpdatePolicyService({
    state: options.refresh.state,
    mutations: options.refresh.mutations,
    sha256: options.refresh.sha256,
  });
  const scheduler = createMarketplaceUpdateScheduler({
    refresh,
    clock: options.refresh.clock,
    delay: options.delay ?? nodeDelay,
  });
  return Object.freeze({ refresh, policy, scheduler });
}

// create-marketplace-refresh-services.ts is compatibility-only.
import {
  createNodeMarketplaceUpdateServices,
  type NodeMarketplaceUpdateServices,
  type NodeMarketplaceUpdateServicesOptions,
} from "./create-marketplace-update-services.js";

export type NodeMarketplaceRefreshServicesOptions = NodeMarketplaceUpdateServicesOptions;
export type NodeMarketplaceRefreshServices = NodeMarketplaceUpdateServices;

export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceUpdateServices(options);
}
```

The update module receives the existing `node:timers/promises` and application imports plus the unchanged private `nodeDelay`; it must not import the refresh module. The refresh module has the sole composition-to-composition import. `src/index.ts` continues exporting each name from its existing module.

**Implementation Notes:**

- Move the implementation; do not duplicate or generalize it.
- Preserve construction order, `Object.freeze`, the exact validation condition/message, and `options.delay ?? nodeDelay`.
- Use named wrapper delegation instead of a direct runtime re-export to avoid changing public function identity/name behavior.
- Use exact TypeScript aliases for both refresh types so direct and barrel consumers see the same option/result contracts as the canonical update types.
- Add no I/O, scheduler start, timer wait, network call, state read, mutation, host registration, option, dependency, or export.
- The complete exact code, test assertions, and structural checks live in the child story.

**Acceptance Criteria:**

- [ ] Both direct module factories construct frozen `{ refresh, policy, scheduler }` services without invoking refresh, policy/state, mutation, claim, materialization/network-adjacent, inspection, clock, or injected delay/timer behavior.
- [ ] `NodeMarketplaceRefreshServicesOptions` equals `NodeMarketplaceUpdateServicesOptions`, `NodeMarketplaceRefreshServices` equals `NodeMarketplaceUpdateServices`, and both factory signatures are exactly equal under `expectTypeOf` through the package barrel.
- [ ] The refresh module imports only the canonical update composition; the update module does not import refresh; `npm run boundaries` passes `no-circular`.
- [ ] `src/index.ts` and `test/compiled-package-import.mjs` remain unchanged, and package verification reports exactly `compiled package import passed (437 exports)`.
- [ ] `npm run typecheck`, focused scheduler/composition and public API tests, `npm run boundaries`, `npm run build`, and `npm run test:package` pass.
- [ ] No I/O/startup/timer/network behavior, scheduler/default policy, validation, result shape, direct import path, barrel contract, or runtime export changes.

**Rollback:** Revert the one story commit, restoring the full implementation to the refresh module and the update module's wrapper/type re-exports. There is no state, schema, migration, timer lifecycle, or network rollback.

## Implementation Order

1. `make-update-services-canonical-node-composition-step-1` — atomically move ownership, install exact compatibility aliases, extend boundary tests, and verify the unchanged 437-export package contract.

## Dependencies and Cycle Check

- Feature: `depends_on: []`.
- Story: `depends_on: []`.
- `.work/bin/work-view --blocking make-update-services-canonical-node-composition` reported no blocking items before the child was written.
- The story has no dependency edge, so it cannot add a substrate cycle.
- `centralize-marketplace-update-record-state-projection` remains independent and is deliberately excluded from this write set.

## Risk and Rollback Summary

**Risk:** Low. Likely failures are a two-way module import, accidental copied type contracts, altered validation/default-delay behavior, an eager construction side effect, or public allowlist drift. Exact type assertions, inert dual-factory construction, dependency-cruiser, and the existing compiled allowlist detect each material hazard.

**Atomic-step acknowledgment:** The source move and compatibility inversion are one atomic checkpoint because either half alone leaves the module graph in an invalid or misleading intermediate state. It is cleanly reversible as one commit; no feature flag or migration is warranted.


## Implementation summary

- Child checkpoint `make-update-services-canonical-node-composition-step-1` is complete at `stage: done` in implementation commit `720c8a9`.
- The update-named composition module now owns Node delay, canonical update types, validation, and complete service wiring. The refresh-named module is a one-way compatibility wrapper with exact type aliases.
- Verification passed: focused scheduler/composition and public API tests (12 tests), full `npm test` (121 files, 649 tests), `npm run typecheck`, `npm run boundaries`, `npm run build`, and `npm run test:package`.
- Package verification remained exact: `compiled package import passed (437 exports)`.
- Review weight: standard (project convention). Per the delegated instruction, the feature is left at `stage: review` and feature review was not invoked.
- Deviations and blockers: none.
