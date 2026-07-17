---
id: idea-distinct-marketplace-add-contention
kind: story
stage: implementing
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Retry distinct marketplace additions after generation contention

## Original finding

Two real packed Pi processes adding different HTTPS Git marketplaces to the same user scope do not both make progress. Both acquisitions complete against separate bare repositories, but one add returns public `rejected / STATE_STALE` while the other commits; only the winner is registered until the user manually retries the unrelated target.

Reproducer: `test/e2e/chaos/multiprocess-network-clock.e2e.test.ts` first proves same-target contention has one authoritative winner, then concurrently adds two distinct marketplace identities through the real fixed-port `git http-backend`. The linked expected failure requires both distinct targets to converge and every process to observe the same three registrations without database corruption.

## Fix contract

- Reuse existing generation-mutation and source-publication authority to retry a distinct add after stale generation.
- Same-source/name contention must remain idempotent or conflict exactly; retries may not broad-accept statuses.
- Bound retries deterministically and avoid a second mutation engine or unsafe claim.
- Prove two packed Pi processes converge distinct registrations and agree on final public state.
