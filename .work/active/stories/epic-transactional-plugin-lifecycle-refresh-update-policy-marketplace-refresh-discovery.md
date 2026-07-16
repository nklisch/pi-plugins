---
id: epic-transactional-plugin-lifecycle-refresh-update-policy-marketplace-refresh-discovery
kind: story
stage: implementing
tags: [security, infra]
parent: epic-transactional-plugin-lifecycle-refresh-update-policy
depends_on: [epic-transactional-plugin-lifecycle-refresh-update-policy-contracts-state-comparison]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Refresh marketplaces and discover immutable candidates

## Checkpoint

Provide explicit and scheduled-mode marketplace refresh over the durable state contracts. Coalesce ordinary Pi sessions with generation-coordinated claims, materialize/read/promote outside long locks, update matching user/project marketplace snapshots, and compare installed plugins with immutable available candidates independently of automatic policy.

## Scope

- Add a bounded marketplace inspection service over the verified content manifest, existing Claude/Codex readers, and marketplace merger.
- Add typed refresh/candidate/result contracts and claim-id port.
- Add a narrow policy service that changes manual/automatic only after exact scope/marketplace/source-identity and project-declaration-digest revalidation; reject local automatic.
- Discover user host-config and project-local update records from the complete scope inventory; process them in stable scope/marketplace order.
- Implement exact scope-generation claim acquisition/completion with 15-minute lease, explicit cadence bypass, scheduled 6-hour success interval, and 5-minute exponential failure backoff capped at 6 hours.
- Materialize and inspect outside generation coordination; promote/publish only after the exact source+claim precondition is rechecked.
- Visit every configured remote marketplace in deterministic order. Scheduled mode skips local; explicit mode may inspect local but never marks it automatic.
- Bind project records to the current project declaration digest and use short scope-generation commits to update only that scope's snapshot/memory.
- Probe unchanged plugin sources only far enough to produce immutable available revision/compatibility evidence; discard staging and perform no trust, configuration, projection, reload, or activation work.
- Persist discovery notification memory before any later automatic application.

## Acceptance evidence

- Construction causes no I/O; explicit service invocation is always available and bypasses cadence while coalescing behind a current claim.
- Policy changes perform no network/trust work, cannot race a source replacement into automatic, and return typed changed/unchanged/rejected results.
- Two service instances coalesce per scope or safely converge after lease expiry; a stale claimant cannot promote/publish. Equal user/project sources may duplicate fetch work but cannot share authority or overwrite one another.
- Network/catalog/plugin work occurs outside locks; state writes are short exact-precondition mutations.
- Every configured remote is attempted, local is scheduled-skipped, and one marketplace/plugin failure does not suppress siblings or change active state.
- Source identity change returns approval-required before fetching the changed external plugin source.
- Different immutable binding is available even under equal display version; same binding is current.
- Incomplete project inventory suppresses project automatic eligibility/pruning but preserves safe user discovery.

## Ordering

Depends on durable v2 identity/memory. Automatic application waits for this checkpoint because it consumes the exact immutable candidate and notification record produced here.
