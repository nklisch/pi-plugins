---
id: idea-distinct-marketplace-add-contention
created: 2026-07-17
updated: 2026-07-17
tags: [compatibility]
---

Two real packed Pi processes adding different HTTPS Git marketplaces to the same user scope do not both make progress. Both acquisitions complete against separate bare repositories, but one add returns public `rejected / STATE_STALE` while the other commits; only the winner is registered until the user manually retries the unrelated target.

Reproducer: `test/e2e/chaos/multiprocess-network-clock.e2e.test.ts` first proves same-target contention has one authoritative winner, then concurrently adds two distinct marketplace identities through the real fixed-port `git http-backend`. The linked expected failure requires both distinct targets to converge and every process to observe the same three registrations without database corruption.
