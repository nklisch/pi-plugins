---
id: idea-isolate-recovery-review-sqlite-fixtures
created: 2026-07-16
updated: 2026-07-16
tags: [cleanup, infra, tests]
---

Make `test/integration/recovery-review-hardening.test.ts` isolate and clean its SQLite fixture files across repeated/interrupted runs. A fresh run passes, but stale `*.sqlite*` artifacts left by earlier executions can make the suite fail until manually removed. This is test-environment reliability only—the production recovery behavior and the update-state refactor remain green—so it is parked below the current-cycle completion bar.
