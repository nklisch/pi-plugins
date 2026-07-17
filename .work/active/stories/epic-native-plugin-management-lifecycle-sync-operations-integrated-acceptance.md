---
id: epic-native-plugin-management-lifecycle-sync-operations-integrated-acceptance
kind: story
stage: implementing
tags: [compatibility, security]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: [epic-native-plugin-management-lifecycle-sync-operations-packaged-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove Integrated Lifecycle and Project Sync

## Checkpoint

Add packed clean-environment, concurrency, recovery, project-sync, security, and fixture acceptance through `application.operations` only. Cover complete skill/hook/MCP lifecycle, trusted manual update, uninstall cleanup, and local `.pi/plugins.json` apply/publish/merge without Claude/Codex or hidden network.

## Acceptance evidence

- Enable/disable/update/uninstall exact current/change/conflict/rollback/recovery/cancel paths pass across same-session and multi-process races.
- Update binds one inspected revision/materialization and preserves prior active projection on every failure.
- Sync covers missing/existing file, baseline sentinel, file/state races, resolutions, constraints, user/project collisions, adopted origins, partial effects, crash/retry, and final digest.
- Security fixtures prove no-follow/root/file identity, hostile text, value/path/secret/native-cause redaction, and zero foreign/network/prerequisite mutation.
- Full `npm test` passes typecheck, boundaries, unit/integration/process tests, build, exact exports, and packed Pi startup/disposal.
