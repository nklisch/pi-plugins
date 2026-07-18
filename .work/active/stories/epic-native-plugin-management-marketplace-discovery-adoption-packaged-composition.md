---
id: epic-native-plugin-management-marketplace-discovery-adoption-packaged-composition
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status, epic-native-plugin-management-marketplace-discovery-adoption-catalog-query, epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

- Added one discovery composition root over the packaged host's existing state, mutation coordinator, current project/trust, content store, source materializers, inspector, update probe, lifecycle service, and clock/identifier custody.
- The started application exposes registration, refresh, policy, safe catalog search/detail, and adoption under one frozen capability. Internal exact candidate resolution remains private to application composition and does not appear on the packaged/public object.
- Current user/project scope is bound at construction; arbitrary paths, roots, or historical project keys are not accepted by public requests.
- Foreign root canonicalization is lazy, scheduler start remains explicit, and construction/startup performs no discovery, refresh, acquisition, or catalog parse.
- Root allowlists were advanced for strict contracts and intended factories; `./pi` remains the three-export packaged boundary.

## Verification

- Focused composition/public-boundary coverage is included in the 44-test application bundle, all green.
- Build, dependency boundaries, compiled root import (562 exports), compiled `./pi` import (3 exports), and packed consumer discovery passed.
