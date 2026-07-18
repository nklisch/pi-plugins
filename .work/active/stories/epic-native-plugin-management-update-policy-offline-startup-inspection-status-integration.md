---
id: epic-native-plugin-management-update-policy-offline-startup-inspection-status-integration
kind: story
stage: done
tags: [compatibility, reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-policy-facade, epic-native-plugin-management-update-policy-offline-startup-notification-ledger, epic-native-plugin-management-update-policy-offline-startup-startup-readiness-orchestrator]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implementation notes

- Extended the existing lifecycle inspection view with effective policy/winning source, exact unread/unresolved notice disposition, schedule freshness/clock regression, and host update-subsystem status.
- `updateDigest` now binds complete v4 registration policy/lease/notice/schedule state plus the derived host status snapshot; any relevant state or background-health change makes prior inspection evidence stale.
- Added registry-owned diagnostics for automatic-pending, configuration-blocked, capability-blocked, and clock-regressed states. No adapter/native message or owner/lease ID reaches output.
- Offline refresh failure remains degraded/stale while exact local activation evidence continues to report the active installed revision; transition/recovery evidence retains blocking precedence.

## Verification

- `npx vitest run test/application/native-installed-inspection.test.ts test/application/native-diagnostic-registry.test.ts test/composition/native-inspection-evidence.test.ts test/application/native-inspection-contract.test.ts` — 38 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
