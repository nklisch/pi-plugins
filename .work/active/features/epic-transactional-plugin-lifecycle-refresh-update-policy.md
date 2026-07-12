---
id: epic-transactional-plugin-lifecycle-refresh-update-policy
kind: feature
stage: drafting
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle
depends_on: [epic-transactional-plugin-lifecycle-operations, epic-transactional-plugin-lifecycle-recovery-journal-gc]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Marketplace Refresh and Update Policy

## Brief

Provide explicit and scheduled marketplace refresh, installed-versus-available revision comparison, once-per-revision notification memory, and per-marketplace automatic-update policy. Checks cover every configured remote marketplace, are rate-limited, cancellable, and outside startup's critical path; notification availability remains independent of whether automatic application is enabled.

Automatic updates are disabled by default for third-party sources, remain bound to unchanged marketplace/plugin source identity, and invoke the same lifecycle transaction and recovery path as manual updates. Network, source, validation, compatibility, trust, activation, or notification failure never blocks startup or disables the active revision. This feature does not render notifications/UI or create a separate update installer.

## Epic context

- Parent epic: `epic-transactional-plugin-lifecycle`
- Position in epic: Wave 5 network policy — terminal consumer of stable lifecycle and recovery semantics
- Depends on operations and recovery/journal/GC
- Required guarantees: crash, concurrency, network, scope, data, and ports guarantees in the parent epic

## Foundation references

- `docs/SPEC.md` — Updates; Performance and availability
- `docs/ARCHITECTURE.md` — Update discovery and notifications; Trust; Pi integration
- `docs/COMPATIBILITY.md` — Update behavior

## Existing contract references

- `src/domain/source.ts` — canonical and immutable revision identity
- `src/domain/marketplace.ts` — normalized marketplace declarations and policy provenance
- `src/application/source-materialization.ts` — cancellable marketplace acquisition

## Late-bound feature decisions

Clock/scheduler port, refresh lease/coalescing, rate and backoff policy, available-revision comparison rules, notification state schema, once-per-revision reset semantics, automatic-update eligibility evaluation, source-identity diff representation, and adapter result shape remain for feature design. No decision may make startup network-dependent or allow policy to bypass trust and whole-plugin activation verification.

## UI alignment

No UI surface. Notification rendering and automatic-update settings controls belong to `epic-native-plugin-management`.
