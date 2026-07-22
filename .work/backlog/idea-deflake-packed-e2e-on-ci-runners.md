---
id: idea-deflake-packed-e2e-on-ci-runners
kind: story
stage: backlog
tags: [perf]
parent: null
depends_on: []
gate_origin: null
created: 2026-07-21
updated: 2026-07-21
---

# De-flake the packed e2e suite on CI runners

`npm run test:e2e` on `ubuntu-latest` flakes on a rotating set of heavy
tests with RPC/prompt timeouts (observed across runs 29866352132,
29864534799, 29864534715, and pre-existing 29829925607): project-capability
diagnostics, chaos multiprocess contention, malformed-refresh catalog
retention, masked sensitive activation, and the packed PTY acceptance. Every
failing file passes locally in isolation, and the failing test is different
each run — the runner is simply much slower than a dev machine, so marginal
tests tip over their (already 2x-scaled) timeouts depending on host
contention.

Candidate directions: profile which phases (npm pack/install, git daemon
startup, packed Pi session boot) dominate on the runner and cache or
pre-build more in global setup; identify the slowest ~5 tests under
`PI_PLUGIN_HOST_E2E_TIMEOUT_SCALE=2` and give them explicit larger budgets
instead of hoping the scale factor covers host variance; or shard the suite
across two CI jobs (fileParallelism is off today, so sharding by directory
would keep determinism while halving per-job load).

## Progress

- 2026-07-21: vitest's own `testTimeout`/`hookTimeout` now honor
  `PI_PLUGIN_HOST_E2E_TIMEOUT_SCALE` (vitest.e2e.config.ts). Root cause of
  the recurring `concurrency-presentation-security` masked-activation
  failure: the test consistently takes ~140 s on CI runners against a fixed
  120 s vitest budget while its internal waits were already 2x-scaled.
  Remaining: profiling/sharding directions above.
- 2026-07-22: same masked-activation test then straddled the SCALED internal
  PTY marker waits (60 s literal × 2 = 120 s expiry, test body ~153 s).
  Raised those literals (120 s/150 s) in
  concurrency-presentation-security.e2e.test.ts.
