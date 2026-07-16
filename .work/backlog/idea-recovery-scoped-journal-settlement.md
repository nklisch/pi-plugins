---
id: idea-recovery-scoped-journal-settlement
created: 2026-07-16
updated: 2026-07-16
tags: [perf, infra]
---

Thread the already-available scope through recovery/reconciler journal settlement calls. Scope-less `settle` currently scans every per-scope journal database to locate one transition, multiplying local I/O and lock contention as project scope count grows. This is below the current-cycle blocker bar because settlement remains correct and bounded; address it later as a focused behavior-preserving efficiency cleanup.
