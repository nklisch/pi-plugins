---
id: make-update-services-canonical-node-composition-step-1
kind: story
stage: implementing
tags: [refactor, infra]
parent: make-update-services-canonical-node-composition
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Invert Node update-composition ownership

## Checkpoint

Move the complete Node marketplace update composition into the update-named module, then make the refresh-named module a one-direction compatibility wrapper with exact type aliases. Preserve both direct module paths, both barrel factory exports, all four public type names, the exact frozen service result, validation behavior, and construction laziness.

**Priority:** Medium

**Risk:** Low

**Source lenses:** elimination / pattern drift / naming and data flow

## Files

- `src/composition/create-marketplace-update-services.ts`
- `src/composition/create-marketplace-refresh-services.ts`
- `test/application/marketplace-update-scheduler.test.ts`
- `test/public-api.test.ts`

`src/index.ts` and `test/compiled-package-import.mjs` are verification surfaces and should remain unchanged.

## Current State

```typescript
// create-marketplace-update-services.ts imports the refresh module and delegates.
export function createNodeMarketplaceUpdateServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceRefreshServices(options);
}

// create-marketplace-refresh-services.ts owns nodeDelay, validation, and all wiring.
export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
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
```

The runtime dependency edge is currently `create-marketplace-update-services.ts` → `create-marketplace-refresh-services.ts`, opposite the canonical ownership described by the update API.

## Target State

`src/composition/create-marketplace-update-services.ts` owns the existing imports, private Node delay, canonical types, validation, and complete wiring without semantic edits:

```typescript
import { setTimeout as nodeSetTimeout } from "node:timers/promises";
import {
  createMarketplaceRefreshService,
  type MarketplaceRefreshService,
  type MarketplaceRefreshServiceDependencies,
} from "../application/marketplace-refresh-service.js";
import {
  createMarketplaceUpdateScheduler,
  type MarketplaceUpdateScheduler,
} from "../application/marketplace-update-scheduler.js";
import type { UpdateDelayPort } from "../application/ports/update-delay.js";
import {
  createMarketplaceUpdatePolicyService,
  type MarketplaceUpdatePolicyService,
} from "../application/marketplace-update-policy-service.js";

const nodeDelay: UpdateDelayPort = Object.freeze({
  async wait(milliseconds: number, signal: AbortSignal) {
    await nodeSetTimeout(milliseconds, undefined, { signal });
  },
});

export type NodeMarketplaceUpdateServicesOptions = Readonly<{
  refresh: MarketplaceRefreshServiceDependencies;
  delay?: UpdateDelayPort;
}>;

export type NodeMarketplaceUpdateServices = Readonly<{
  refresh: MarketplaceRefreshService;
  policy: MarketplaceUpdatePolicyService;
  scheduler: MarketplaceUpdateScheduler;
}>;

/**
 * Wire the complete portable marketplace update surface to Node's abortable
 * timer. Construction performs no I/O and starts no work.
 */
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
```

Keep the existing validation condition and error text exactly; renaming the message is not part of this ownership refactor. `src/composition/create-marketplace-refresh-services.ts` becomes only the compatibility surface:

```typescript
import {
  createNodeMarketplaceUpdateServices,
  type NodeMarketplaceUpdateServices,
  type NodeMarketplaceUpdateServicesOptions,
} from "./create-marketplace-update-services.js";

export type NodeMarketplaceRefreshServicesOptions = NodeMarketplaceUpdateServicesOptions;
export type NodeMarketplaceRefreshServices = NodeMarketplaceUpdateServices;

/** Compatibility name retained for existing hosts and direct module imports. */
export function createNodeMarketplaceRefreshServices(
  options: NodeMarketplaceRefreshServicesOptions,
): NodeMarketplaceRefreshServices {
  return createNodeMarketplaceUpdateServices(options);
}
```

Use a wrapper rather than a direct re-export so both public functions retain their existing function names and remain distinct function objects. The only composition dependency edge becomes `create-marketplace-refresh-services.ts` → `create-marketplace-update-services.ts`; the canonical update module must not import the refresh module. `src/index.ts` continues exporting each factory and type family from its current direct module, so direct and barrel import paths remain stable.

## Implementation Notes

- Move, do not duplicate, `nodeDelay`, the application imports, option/result shapes, validation, and the three service constructions.
- Rename only the owning type declarations from `Refresh` to `Update`; define the refresh types with TypeScript aliases (`=`), not copied object types or interfaces.
- Do not add options, dependencies, eager calls, scheduler startup, background work, host registration, or network adapters.
- Do not call `delay.wait`, `clock`, refresh/state/mutation/claim/materialization/inspection ports, or any async method during either factory call.
- Keep `Object.freeze({ refresh, policy, scheduler })`, property names, construction order, default Node delay selection, and thrown validation behavior unchanged.
- Do not edit `src/index.ts` or the compiled export allowlist. Type aliases erase at runtime; both existing factory names remain the only affected runtime exports.
- The direct-read scan found no additional abstraction worth introducing: one canonical implementation plus one compatibility wrapper is the smallest ownership inversion.

## Tests and Acceptance Criteria

- [ ] Extend `test/application/marketplace-update-scheduler.test.ts` to import both factories from their direct composition module paths and construct both with the same inert dependency set plus an injected delay spy.
- [ ] Assert both results are frozen and expose exactly `refresh`, `policy`, and `scheduler`; assert construction leaves all refresh, policy/state, mutation, claim, materialization/network-adjacent, inspection, clock, and delay/timer counters at zero.
- [ ] Add barrel-level compile-time assertions in `test/public-api.test.ts`:

  ```typescript
  expectTypeOf<NodeMarketplaceRefreshServices>()
    .toEqualTypeOf<NodeMarketplaceUpdateServices>();
  expectTypeOf<NodeMarketplaceRefreshServicesOptions>()
    .toEqualTypeOf<NodeMarketplaceUpdateServicesOptions>();
  expectTypeOf(createNodeMarketplaceRefreshServices)
    .toEqualTypeOf(createNodeMarketplaceUpdateServices);
  ```

  Import both factories and all four types from `src/index.ts`; this protects exact public signature/type identity without creating runtime exports.
- [ ] Keep `test/compiled-package-import.mjs` unchanged. `npm run test:package` must still print `compiled package import passed (437 exports)`, proving both factory names remain on the exact runtime allowlist and no runtime export was added or removed.
- [ ] Search confirms the update module contains the sole `nodeDelay`, options/result object declarations, validation, and `{ refresh, policy, scheduler }` construction; the refresh module contains only the aliases and one-line delegation.
- [ ] Import-cycle check confirms the refresh module imports the update module, the update module has no refresh-module import, and `npm run boundaries` passes the repository's `no-circular` rule.
- [ ] `npm run typecheck`, the focused scheduler/composition test, `test/public-api.test.ts`, `npm run boundaries`, `npm run build`, and `npm run test:package` pass.
- [ ] No I/O, startup, timer, network, scheduler, default-policy, return-shape, validation, direct-module, barrel, or public-export behavior changes.

## Risk

Low. The small write set can still accidentally create a two-way composition import, copy rather than alias a public type, alter validation/default-delay behavior, or drift the package allowlist. The one-direction import rule, exact type assertions, inert construction test, dependency-cruiser, and 437-export package check directly cover those hazards.

## Rollback

Revert this single checkpoint: restore full composition ownership in `create-marketplace-refresh-services.ts` and restore `create-marketplace-update-services.ts` as the update-named wrapper/type re-export. No data, schema, migration, timer lifecycle, or network rollback is required.

## Dependencies

No implementation dependency. The parent feature has `depends_on: []`, this story has `depends_on: []`, and `.work/bin/work-view --blocking make-update-services-canonical-node-composition` reported no blocking items. This is independent of `centralize-marketplace-update-record-state-projection`; their write sets and rollback boundaries remain separate. The empty dependency edge set cannot introduce a cycle.
