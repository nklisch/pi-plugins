---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-automatic-application-authority
kind: story
stage: done
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-refresh-update-policy
depends_on: [epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-17
---

# Apply source-bound automatic updates through lifecycle

## Checkpoint

Authorize automatic application only from current durable scope-local marketplace policy, an exactly trusted previous installed revision, unchanged stable marketplace/plugin source identities, and a probe-matched immutable candidate. Invoke the same lifecycle update transaction, journal, reload verification, rollback, and recovery path used by manual updates.

## Scope

- Add automatic authorization policy that verifies current user host-config or project-local update record (including project declaration digest), exact baseline trust, project trust, prior/candidate stable identities, scope, and plugin.
- Keep manual/sync/adoption candidate authorization exact-revision trust only.
- Add `expectedRevision` to automatic update requests and reject a moved source/ref before promotion.
- Let candidate configuration resolution consume only internal authorization evidence produced in the same preparation call; do not expose a public trust bypass.
- Have refresh call only `PluginLifecycleService.update({ origin: "automatic-update", ... })`, then map lifecycle outcomes to durable disposition/notification memory.
- Treat changed/unchanged as convergence, classify retryable/manual/recovery outcomes, and never invoke recovery or a lower-level mutation path from refresh.

## Acceptance evidence

- Manual, local, changed-source, legacy-identity, missing/revoked baseline trust, and untrusted project cases still discover/notify but never automatically mutate.
- Changed skill/hook/MCP surfaces are allowed only by explicit automatic policy over unchanged source identity; all lifecycle compatibility/configuration/activation safeguards still run.
- A forged direct automatic origin cannot bypass durable policy or exact previous trust.
- A ref moving after discovery yields `AVAILABLE_REVISION_CHANGED` before promotion and preserves active state.
- Every automatic attempt is observed at the public lifecycle `update` method with `origin: automatic-update`; no refresh code calls promotion/state/reload/journal internals.
- Changed, unchanged, rejected, stale, rolled-back, and recovery-required lifecycle results map to stable dispositions with one notification intent per candidate.
- Pending recovery blocks application without duplicating recovery semantics.

## Ordering

Depends on immutable discovery evidence. Scheduler/composition hardening waits until the automatic branch is fully source-bound and lifecycle-owned.

## Implementation notes

- Added package-internal automatic authorization evidence with a non-forgeable constructor. Authorization requires the current durable marketplace policy, unchanged stable marketplace/plugin identities, exact previous revision trust, immutable expected revision, and project trust/declaration evidence where applicable.
- Extended the public lifecycle update request with `expectedRevision`; candidate preparation checks it after materialization/inspection and before promotion, returning `AVAILABLE_REVISION_CHANGED` without changing active state. Automatic updates use the same lifecycle transaction, journal, reload observation, rollback, and recovery path as manual updates.
- Kept configuration resolution's public trust path unchanged. The lifecycle preparation path can use only authorization evidence created in the same call, and reconstruction of legacy installed revisions preserves their optional v2 evidence rather than inventing source identities.
- Refresh now invokes only `PluginLifecycleService.update` for eligible probes, maps every lifecycle outcome to durable notification disposition, and retains discovery memory when policy, trust, source, or lifecycle application denies the candidate.

## Verification

- `npm run typecheck` passed.
- Focused lifecycle/configuration/state suites passed: 36 tests.
- Existing lifecycle regression coverage passed, including rollback, generation rebasing, target-change recovery, and immutable installed-evidence reconstruction.
