---
id: epic-native-plugin-management-deterministic-control-facade-packaged-composition
kind: story
stage: implementing
tags: [compatibility, architecture]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch, epic-native-plugin-management-deterministic-control-facade-mutation-workflow-dispatch, epic-native-plugin-management-deterministic-control-facade-result-output-exit]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose the Unified Packaged Control Service

## Checkpoint

Expose typed/text/argv execute, help, completion, poll, and cancel through one `NativePluginControlService`; compose it over private packaged application services; make `application.control` the packaged management surface; and integrate exact admission/disposal.

## Files

- `src/application/native-control-service.ts`
- `src/composition/create-native-control-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/infrastructure/node/node-identifiers.ts`
- `src/index.ts`
- `src/pi/index.ts`
- focused service, composition, boundaries, exports, and disposal tests

## Acceptance evidence

- Direct typed, argv, and text calls converge on one validated dispatch/result path; execution mode changes no business behavior.
- `PackagedPluginHostApplication` exposes only `control` for management; marketplace/inspection/install/lifecycle/update/status and other privileged joins remain private.
- `runWithPiOperationContext` remains packaged command admission; construction/startup cause no parser/input/output/timer/network/operation effect.
- Concurrent commands, reload predecessor/successor, stale tokens, failed startup, repeated close, and admitted cancellation preserve host operation/reload/drain guarantees.
- Source/compiled/packed allowlists expose intended facade contracts and exclude mutable registries, handlers, raw services, sinks, input bytes, session bindings, roots, and causes.
