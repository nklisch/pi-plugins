---
id: epic-native-plugin-management-update-policy-offline-startup-policy-facade
kind: story
stage: done
tags: [compatibility, reliability]
parent: epic-native-plugin-management-update-policy-offline-startup
depends_on: [epic-native-plugin-management-update-policy-offline-startup-contracts-state]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Implement Deterministic Update Policy Preview, Apply, and Status

## Checkpoint

Implement pure effective-policy resolution and a native policy service over existing state/CAS authorities. Preview exact global, scope, marketplace-registration, and plugin changes; disclose automatic-policy breadth; bind project/source/generation evidence; apply only an exact preview plus consent; and report persisted/effective policy, winning level, cadence, due/clock, and safe lease status.

## Files

- `src/application/update-policy-resolution.ts`
- `src/application/native-update-policy-service.ts`
- `src/application/marketplace-update-policy-service.ts`
- `src/application/ports/update-policy-authority.ts`
- focused application and concurrency tests

## Acceptance evidence

- Preview/apply/status perform no network, source acquisition, trust grant, secret access, lifecycle operation, notification publication, or timer start.
- Changed generation, registration/source, plugin source, project key/root/trust, preview, or consent returns typed stale/rejected with no write.
- Two process-local service instances over shared durable state produce one exact commit and deterministic stale/current convergence.
- Global automatic consent truthfully covers future registrations when inventory is incomplete; local/source-change guards remain manual regardless of broader policy.

## Implementation notes

- Added one pure resolver for exact plugin → marketplace → scope → global precedence with hard manual guards for local, legacy, marketplace-source, and plugin-source changes.
- Added a network-free native policy service with deterministic preview/consent IDs, current/future breadth disclosure, exact target validation, CAS-backed apply, project trust binding, and safe status projection.
- Exposed a narrow `UpdatePolicyAuthorityPort` for lifecycle admission; the legacy per-marketplace setter remains only as a compatibility adapter over the same registration authority.
- Concurrent service instances recompute authority before apply, so a preview is stale after any relevant generation change rather than overwriting it.

## Verification

- `npx vitest run test/application/update-policy-resolution.test.ts test/application/native-update-policy-service.test.ts` — 5 tests passed.
- `npx tsc -p tsconfig.json --noEmit` — passed.
