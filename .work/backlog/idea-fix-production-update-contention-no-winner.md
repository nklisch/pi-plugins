---
id: idea-fix-production-update-contention-no-winner
kind: story
stage: backlog
tags: [reliability]
parent: null
depends_on: []
created: 2026-07-19
updated: 2026-07-19
---

# Restore one winner during multiprocess update contention

The production `concurrency-presentation-security.e2e.test.ts` update-contention case reproduced twice with neither of two simultaneous updates returning the expected successful outcome. The sibling mutation still converged, and the manager presentation cases passed. Investigate owner admission/recovery behavior so exactly one contender succeeds and the other reports the documented conflict or stale outcome. This predates and is independent of the settings-style manager presentation patch.
