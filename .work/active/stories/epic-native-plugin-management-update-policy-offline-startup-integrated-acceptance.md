---
id: epic-native-plugin-management-update-policy-offline-startup-integrated-acceptance
kind: story
stage: implementing
tags: [compatibility, reliability, testing]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Prove Native Updates and Offline Startup End to End

## Checkpoint

Add feature-boundary acceptance for policy precedence/consent, notice restart/delivery/ack/pruning, multiprocess scope leases and claims, clocks/restart cadence, manual/automatic races, exact lifecycle rollback/recovery, offline startup/status, project trust/root changes, missing secret/fork capability, and shutdown. Use packed/local adapters where meaningful and existing lifecycle/materializer suites for lower-level guarantees.

## Files

- `test/integration/native-update-policy-precedence.test.ts`
- `test/integration/native-update-notification-restart.test.ts`
- `test/integration/native-update-scheduler-multiprocess.test.ts`
- `test/integration/native-automatic-update-races.test.ts`
- `test/integration/packaged-host-offline-startup.test.ts`
- `test/integration/packaged-host-update-shutdown.test.ts`
- `test/fixtures/native-inspection/split-inspector.ts`
- public/compiled allowlist tests

## Acceptance evidence

- A clean packed Pi host with no Claude/Codex, network, marketplace, secret provider, MCP fork, or subagent fork starts ready and performs no eager timer/network work.
- Restart preserves schedule/backoff, policy, notice identity/publication/ack/counts, and active revisions; recovery settles before retry.
- Two processes prove one owner per scope, safe lease/claim expiry and clock jumps, one retained publisher event, and convergent manual/automatic updates.
- Project/root/trust change, secret unavailable, missing runtime capability, moved/source-changed candidate, cancellation, rollback, recovery-required, stale/offline catalog, remote failure, and shutdown preserve prior active revisions and isolate siblings.
- Full `npm test` passes typecheck, boundaries, focused integrations, build, packed import, and exact exports.
