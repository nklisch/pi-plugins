---
id: epic-native-plugin-management-marketplace-discovery-adoption-refresh-atomic-status
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-registration-service]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Make refresh snapshot-atomic and offline-honest

## Checkpoint

Tighten the existing refresh/update services around exact current-scope registration IDs and discriminated outcomes. Claims remain durable coordination only; acquisition/inspection stays outside locks; immutable promotion plus selected-snapshot/status replacement commits atomically. Preserve installed-plugin update probing and notification authority unchanged.

## Files

- `src/application/update-contract.ts`
- `src/application/marketplace-refresh-service.ts`
- `src/application/marketplace-update-state.ts`
- `src/application/marketplace-update-policy-service.ts`
- `src/composition/create-marketplace-update-services.ts`
- focused refresh/update integration tests

## Acceptance evidence

- Refresh batches are exact-scope and deterministic; historical project databases are not scheduled.
- Changed and unchanged full Git revision/content evidence publishes with one selected-state commit; ETag is explicitly not applicable.
- Offline/transient, malformed catalog, partial source, promotion, stale source, and cancellation retain the prior selected snapshot and expose exact safe status.
- Normal abort clears only the owned claim through a cleanup signal; crash claims coalesce until bounded lease expiry and then retry without PID takeover.
- Concurrent refresh/remove and two-process refresh resolve to committed/coalesced/removed/stale evidence without selecting stale content.
- Scheduled local sources are skipped; explicit local refresh works and later browse labels freshness `unknown-local`.

## Implementation notes

- Reworked refresh requests/results around exact registration IDs, current scope selection, strict discriminated outcomes, retained cache evidence, and deterministic ordering.
- Claims are short generation mutations. Acquisition/inspection remains outside coordination; promotion and selected-snapshot/registration publication share one final mutation. Git commit/content/binding equality, not ETag, determines unchanged refreshes.
- Failures and cancellation clear only an owned claim with an uncancelled cleanup signal, preserve the prior snapshot, and record bounded retry/attempt evidence. Expired claims can be replaced without PID takeover.
- Existing installed-plugin probing/lifecycle application and durable notification deduplication remain in the same authority path; catalog-wide install/update behavior was not added.

## Verification

- Focused refresh, policy, and search/adoption application bundle: 44 passed, 0 failed.
- Concurrent refresh coalescing, inventory completeness, moved revision, notification durability, and refresh/remove acceptance are covered.
