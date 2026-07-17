---
id: epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration
kind: story
stage: implementing
tags: [compatibility, reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-policy-facade, epic-native-plugin-management-update-policy-offline-startup-notification-ledger, epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Project Update Policy and Startup Status Into Inspection

## Checkpoint

Extend the existing snapshot-bound native inspection and diagnostic registry with effective policy source, exact notice unread/resolution, unresolved/unread counts, automatic pending/blocked/retry/recovery states, schedule freshness/clock state, and host update-subsystem status. Bind all returned fields into `updateDigest`; inspection remains read-only and offline.

## Files

- `src/application/ports/native-inspection-evidence.ts`
- `src/application/native-inspection-contract.ts`
- `src/application/native-installed-inspection.ts`
- `src/application/native-diagnostic-registry.ts`
- `src/composition/native-inspection-evidence.ts`
- `src/composition/create-native-inspection-service.ts`
- focused inspection/diagnostic/evidence tests

## Acceptance evidence

- Inspection explains effective policy, available revision, unread versus unresolved, automatic pending/applied/retry/recovery, clock regression, and remote failure without starting work.
- Any policy/notice/schedule lease/startup/catalog/target/project/capability change invalidates the bound snapshot.
- Offline stale catalogs and remote MCP/update failures degrade rather than erase exact local activation; transition/recovery mismatches remain blocking.
- Updated split-inspector data validates with no renderer, command copy, owner ID, path, secret/provider text, native cause, or publisher error leakage.
