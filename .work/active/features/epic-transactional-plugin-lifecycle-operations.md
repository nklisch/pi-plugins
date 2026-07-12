---
id: epic-transactional-plugin-lifecycle-operations
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-trust-config-secrets, epic-transactional-plugin-lifecycle-generation-locking, epic-transactional-plugin-lifecycle-immutable-stores-promotion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Whole-Plugin Lifecycle Operations

## Brief

Orchestrate install, enable, disable, update, and uninstall as complete-plugin transitions over the finished foreign-model materialization, inspection, and compatibility contracts. Long-running work occurs before a short generation-checked commit; incompatible bundles, missing trust/configuration, stale generations, promotion failure, projection preparation failure, reload failure, or verification mismatch preserve the previous working revision.

This feature defines stable outbound projection, reload, and post-reload verification ports so later skill, hook, and MCP runtime epics can participate without owning transaction policy. It does not implement those runtimes, Pi reload, `/plugin` commands or UI, startup recovery/GC, refresh scheduling, automatic-update policy, or foreign-state readers.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 3 convergence — the sole coordinator for whole-plugin mutation
- Depends on trust/config/secrets, generation locking, and immutable promotion
- Required guarantees: every cross-cutting guarantee and downstream seam in the parent epic

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Atomic change
- `docs/SPEC.md` — Lifecycle operations; Install transaction; Enablement
- `docs/ARCHITECTURE.md` — Installation transaction; Runtime projections; Pi integration
- `docs/COMPATIBILITY.md` — Whole-plugin behavior

## Existing contract references

- `src/application/source-materialization.ts` — verified source acquisition handoff
- `src/application/inspection-service.ts` — complete normalized plugin bundle
- `src/application/compatibility-service.ts` — complete compatibility report and runtime requirements
- `src/domain/plugin.ts` and `src/domain/compatibility.ts` — authoritative normalized inputs

## Late-bound feature decisions

Application service grouping, command request/result shapes, retry and idempotency keys, pending-transition preparation point, compensation ordering, projection descriptor schema, reload evidence shape, verification timeout, uninstall content/data policy boundary, and multi-scope precedence remain for feature design. There must be one transaction path shared by manual, automatic-update, sync, and adoption consumers; no caller may bypass compatibility, trust, generation, or activation verification.

## UI alignment

No UI surface. Deterministic commands and interactive management belong to `epic-native-plugin-management`.
