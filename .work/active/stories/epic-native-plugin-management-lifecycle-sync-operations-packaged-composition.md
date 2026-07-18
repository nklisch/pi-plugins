---
id: epic-native-plugin-management-lifecycle-sync-operations-packaged-composition
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-session-facade-admission-disposal]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Package One Ongoing-Operation Surface

## Checkpoint

Compose the operation facade from the existing inspection/readiness/candidate/lifecycle/state/coordinator/lock/trust/config/project/registration/recovery authorities plus the new project file adapter. Replace packaged `application.lifecycle` with `application.operations`; raw lifecycle/prepared/state/file/root handles remain private for internal services.

All calls are intended to run inside `PackagedPluginHost.runWithPiOperationContext`. Integrate quiesce and close after admitted-operation drain and before dependent adapters close.

## Acceptance evidence

- Packaged command/TUI consumers obtain ongoing mutations only through `application.operations`; trusted installation retains its separate signed-off flow.
- Construction/startup creates no session and performs no file read/write, acquisition, sync, network, or scheduler work.
- Operation context/reload predecessor/successor/disposal/partial startup/repeated close behavior remains exact.
- Root/`./pi` exports and dependency boundaries expose no raw lifecycle bypass, state/file capability, SQLite handle, root, or fake participant.

## Implementation notes

- Added private packaged composition for the operation facade over the shared inspection evidence, candidate lease/candidate service, lifecycle composition, state coordinator/locks, exact trust/configuration, project root/trust, registration removal, recovery cleanup, and fixed project-file adapter.
- Trusted install and manual update now share one candidate service. Raw lifecycle remains private for trusted install, marketplace policy, recovery, and operation composition; packaged `application.lifecycle` was replaced by `application.operations`.
- Every packaged operation method checks `runWithPiOperationContext` admission before touching its session/service. Shutdown quiesces operations and trusted install, drains admitted work, closes sessions, then releases dependent application adapters in existing reverse order.
- Startup constructs adapters only: it performs no project-file read/write, candidate acquisition, sync, session creation, network, or scheduler action. Recovery adds only the existing local startup pass plus durable uninstall cleanup.
- Verification: strict typecheck; dependency boundaries green (337 modules / 2,403 dependencies); 9 focused composition/startup/disposal tests passed.
