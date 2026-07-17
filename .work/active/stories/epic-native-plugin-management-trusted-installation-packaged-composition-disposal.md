---
id: epic-native-plugin-management-trusted-installation-packaged-composition-disposal
kind: story
stage: implementing
tags: [compatibility, security, infra]
parent: epic-native-plugin-management-trusted-installation
depends_on: [epic-native-plugin-management-trusted-installation-session-orchestration]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Compose trusted installation with host admission and disposal

## Checkpoint

Wire one private candidate lease/evidence/readiness/lifecycle/trust/configuration graph into `PackagedPluginHostApplication.trustedInstallation`. Preserve `runWithPiOperationContext` admission and lifecycle-reload draining, then dispose all unclaimed sessions before dependent adapters close.

## Files

- `src/composition/create-trusted-installation-service.ts`
- `src/composition/create-native-inspection-service.ts`
- `src/composition/create-packaged-plugin-host.ts`
- `src/composition/packaged-plugin-host-contract.ts`
- `src/composition/create-host-configuration.ts`
- `src/index.ts`
- `test/composition/create-trusted-installation-service.test.ts`
- `test/composition/packaged-plugin-host-contract.test.ts`
- `test/integration/packaged-host-disposal.test.ts`
- `test/tooling/boundaries.test.ts`

## Acceptance evidence

- Packaged callers need only the trusted-install service for the signed three-step application workflow.
- Raw resolver/materializer/lease/trust mutation/prepared lifecycle/store/root/session capabilities remain private.
- Startup performs no candidate acquisition or network work; only `open` materializes.
- Shutdown rejects new admission while an admitted install/reload settles, then releases every unclaimed lease in reverse dependency order.
- Partial startup, reload successor, repeated close, expired sessions, and cleanup failure retain existing aggregate cleanup semantics and layer boundaries.
