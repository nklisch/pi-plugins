---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-review-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-refresh-update-policy
depends_on: [epic-transactional-plugin-lifecycle-refresh-update-policy-scheduled-composition-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Close update authority, notification, and compatibility gaps

## Standard-review fix set

The one permitted independent feature pass found a material integrated fix set:

1. Publicly export and compose `MarketplaceUpdatePolicyService` so a host can set policy through its exact scope/source preconditions.
2. Add focused policy-service tests and the promised shared-state/two-session refresh integration. Exercise manual and automatic policy, equal display/different immutable revision, source/trust denial, forged automatic origin, moved expected revision, lifecycle outcome mapping, durable coalescing, and exactly one application-level notification intent.
3. Correct automatic dispositions: moved expected revision is retryable; incompatible/unconfigured/untrusted/manual-required outcomes must not retry forever; stale/promotion/projection/abort/verified rollback remain retryable; recovery-required remains recovery-required.
4. Keep `MarketplaceUpdateScheduler.run` alive after non-abort refresh failures; abort still terminates immediately and honestly.
5. Preserve notification intents already durably committed for earlier plugins if a later iteration throws. Catch per plugin or return accumulated committed intents; never mark emitted then lose the only intent.
6. Replace the all-zero SHA-256 candidate-key construction in `compareInstalledRevision`. Use a real injected hash or remove key creation from the pure comparison and derive at a caller with exact changed declaration identity.
7. When refresh/policy writes v2 records through a v1-envelope compatibility store, explicitly produce a v2 replacement so claim/backoff/notification memory is not reset.
8. Thread inventory completeness as invocation-local evidence through refresh; concurrent explicit/scheduled calls cannot overwrite one another's automatic-eligibility decision.

The cadence's standalone `remove-dead-marketplace-refresh-scaffolding` story already removed the independent review's dead-code nit; do not restore it.

## Constraints

- Preserve offline startup, explicit invocation, source-bound trust, one public lifecycle update path, recovery/journal/rollback behavior, active revision safety, v1 migration compatibility, and private authorization capability evidence.
- No second installer, timer authority, state database, notification renderer, Pi adapter, or process-local correctness authority.
- Automatic authorization constructor/evidence and claim mutation helpers remain private.
- Do not weaken tests or convert expected failures into permissive outcomes.
- Standard review already ran: after this exact fix set, host closure is administrative verification only.

## Acceptance evidence

- [ ] Public source/compiled API exposes the update policy factory/type and Node composition returns it, while private authorization/claim/timer/state internals remain absent.
- [ ] Policy tests prove manual→automatic, source race, local automatic rejection, project binding, and no network/trust mutation.
- [ ] Two refresh instances over shared state coalesce/converge and emit exactly one intent per candidate for manual and automatic policy.
- [ ] Manual policy emits a notification intent without automatic lifecycle application; automatic failures preserve discovery and do not duplicate/loss intents.
- [ ] Forged automatic origin, absent/revoked baseline trust, source identity change, project distrust, and moved expected revision cannot promote or activate.
- [ ] Table-driven disposition tests cover every lifecycle result/rejection category.
- [ ] Scheduler continues after one non-abort refresh failure and propagates abort.
- [ ] A later-plugin throw returns earlier durably committed intents rather than losing them.
- [ ] Source-change candidate keys differ across exact changed identities/revisions and never use a constant digest.
- [ ] Refresh/policy mutation through v1-envelope state preserves non-default v2 claim/backoff/notification memory.
- [ ] Concurrent refresh calls keep completeness local; incomplete inventory cannot gain automatic eligibility from another call.
- [ ] Full `npm test`, boundaries, build, and compiled export allowlist pass.
