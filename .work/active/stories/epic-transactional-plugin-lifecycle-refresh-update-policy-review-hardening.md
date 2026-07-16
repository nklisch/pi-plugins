---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-review-hardening
kind: story
stage: done
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

- [x] Public source/compiled API exposes the update policy factory/type and Node composition returns it, while private authorization/claim/timer/state internals remain absent.
- [x] Policy tests prove manual→automatic, source race, local automatic rejection, project binding, and no network/trust mutation.
- [x] Two refresh instances over shared state coalesce/converge and emit exactly one intent per candidate for manual and automatic policy.
- [x] Manual policy emits a notification intent without automatic lifecycle application; automatic failures preserve discovery and do not duplicate/loss intents.
- [x] Forged automatic origin, absent/revoked baseline trust, source identity change, project distrust, and moved expected revision cannot promote or activate.
- [x] Table-driven disposition tests cover every lifecycle result/rejection category.
- [x] Scheduler continues after one non-abort refresh failure and propagates abort.
- [x] A later-plugin throw returns earlier durably committed intents rather than losing them.
- [x] Source-change candidate keys differ across exact changed identities/revisions and never use a constant digest.
- [x] Refresh/policy mutation through v1-envelope state preserves non-default v2 claim/backoff/notification memory.
- [x] Concurrent refresh calls keep completeness local; incomplete inventory cannot gain automatic eligibility from another call.
- [x] Full `npm test`, boundaries, build, and compiled export allowlist pass.

## Implementation notes

- Execution capability: GPT-5.6 Luna xhigh, direct feature-owner implementation; the requested fix set crosses the policy, refresh, lifecycle, scheduler, composition, and public-contract seams.
- Review weight: standard, caller policy; the independent feature pass already ran and this story only verifies its receiver-confirmed fixes.
- Files changed: update-policy comparison/compatibility parser; policy service; refresh service; scheduler; project lifecycle/reconciliation state writers; Node composition and update composition alias; public source and compiled allowlists; focused policy, authority, scheduler, disposition, domain, and shared-state integration tests.
- Tests added/updated: policy CAS/memory-preservation tests, automatic authority tests, table-driven disposition tests, scheduler continuation test, source-change identity vectors, and two-service/manual/automatic/inventory-local integration coverage.
- Simplification: removed pure-comparison candidate-key construction and the fake all-zero recovery transition; lifecycle failures now map to typed retryable notification disposition without manufacturing recovery evidence.
- Discrepancies from design: the existing refresh composition file remains the compatibility implementation and a thin `create-marketplace-update-services.ts` alias supplies the named update composition surface; no second runtime authority was introduced.
- Adjacent issues parked: `42268f4` notification pruning and `7a278af` source-equality cleanup remain out of scope.
