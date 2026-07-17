---
id: epic-native-plugin-management-inspection-diagnostics-packaged-service-composition
kind: story
stage: implementing
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
