---
id: epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status, epic-native-plugin-management-marketplace-discovery-adoption-catalog-query, epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose the packaged marketplace discovery capability

## Checkpoint

Wire registration, refresh/policy, catalog projection/resolution, and adoption into the existing started packaged application graph. Bind all public scope selections to user plus exact current trusted project; keep raw stores, mutations, readers, roots, normalized-entry capabilities, and adapter details private.

## Files

- `src/composition/create-marketplace-discovery-services.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/index.ts`
- `src/pi/index.ts`
- composition/public-boundary/dependency tests

## Acceptance evidence

- One `application.marketplace` capability exposes registration, refresh/policy, catalog, and adoption using the same state/content/materializer graph.
- Arbitrary project keys, canonical project roots, historical project scopes, raw commits, and unverified entries cannot cross the public boundary.
- Host construction/startup performs no foreign read, refresh, source acquisition, scheduler start, network, or catalog parse.
- Root and `./pi` exports contain strict safe contracts/factories only; internal resolver brands, paths, state/content mutation, credentials, and native causes remain private.
- Existing lifecycle/update probe/application services are reused rather than wrapped by another container or service locator.
