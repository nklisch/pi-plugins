---
id: epic-native-plugin-management-inspection-diagnostics-packaged-service-composition
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: [epic-native-plugin-management-inspection-diagnostics-diagnostic-compiler]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose the unified packaged inspection service

## Checkpoint

Implement list/detail/diagnose over one evidence capture and expose it as `PackagedPluginHostApplication.inspection`. Keep the bundle inspector and resolver/materializer/state/runtime adapters private. Retain a blocked read-only container after classifiable state/recovery/runtime startup failures so diagnostics can explain them.

## Files

- `src/application/native-inspection-service.ts`
- `src/composition/create-native-inspection-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/create-marketplace-discovery-services.ts`
- `src/index.ts`
- `src/pi/index.ts`
- `test/application/native-inspection-service.test.ts`
- `test/composition/create-native-inspection-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/tooling/boundaries.test.ts`

## Acceptance evidence

- Later callers obtain all management read facts through one service without direct joins.
- Sorting/search/pagination/detail are deterministic, stateless, collision-free, and snapshot-bound.
- Clean start is empty/offline-ready; classifiable blocked startup exposes read-only diagnostics without weakening mutation guards.
- Startup/list/host diagnosis performs no candidate acquisition, refresh/update check, MCP remote work, scheduler, hook execution, reload, or mutation.
- The packaged application no longer exposes the ambiguous low-level bundle inspector.

## Implementation notes

- Added unified `list`, `detail`, and `diagnose` orchestration over one captured evidence snapshot. Installed subjects sort before candidates; scope/name/revision/ID use unsigned UTF-8 order; search reuses marketplace normalization; cursors bind the exact filter and authority snapshot.
- Detail IDs route to exactly one projector only after checksum and current snapshot verification. Host diagnosis consumes local scope/recovery/capability/catalog evidence and optional read-only adoption preview without candidate acquisition.
- Added a composition root that owns evidence/readiness/projector adapters. Marketplace composition now retains a private resolver/preview surface for this root while preserving the existing public discovery API.
- Packaged startup captures capabilities once for compatibility, desired runtime, and inspection. `PackagedPluginHostApplication.inspection` is now only `NativeInspectionService`; the bundle inspector, resolver, materializer, state, runtime, and readiness adapters stay private.
- Local runtime reconstruction failure leaves a blocked read-only application container; root/open/composition and successor failures remain terminal. Existing mutation services retain their guards.
- Verification: `npm run typecheck`, `npm run boundaries`; focused service/composition/packaged/marketplace suites (12 tests).
