---
id: epic-native-plugin-management-update-policy-offline-startup-integrated-acceptance
kind: story
stage: done
tags: [compatibility, reliability, testing]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-packaged-lifetime-composition]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
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

## Implemented acceptance matrix

- Migration and strict schema behavior: v1/v2/v3→v4 host/project fixtures, deterministic identifiers, and public DTO tests.
- Policy: plugin→marketplace→scope→global precedence, consent/preview CAS, stale previews, project trust, source replacement, and network-free status.
- Notifications: duplicate publication, concurrent CAS, separate read/resolution state, exact revision identity, acknowledgment idempotence, and bounded pruning.
- Scheduling: two-owner lease fencing, expiry/takeover, persisted restart cadence, deterministic jitter/backoff, forward jumps, and backward clock regression.
- Automatic application: policy eligibility, missing host context, trust/root/config/source/candidate/capability drift, concurrent authority races, lifecycle outcomes, rollback, and recovery-required retention.
- Startup/lifetime: inert factory, recovery-first trace, clean offline readiness, unavailable optional capabilities, management admission, policy persistence across packaged restart, shutdown quiescence, and isolated packed installation.
- Public and packed export allowlists were advanced intentionally; stale pre-v4 fixtures were updated rather than weakening strict parsing.

## Verification

- `npm test` — passed: typecheck, dependency boundaries (358 modules / 2,599 dependencies), 274 test files / 1,333 tests, 783 public exports, 3 Pi exports, isolated packed Pi startup.
- No network, command/TUI renderer, alternate lifecycle path, recovery store, scheduler, secret custody, or fork capability was introduced.
