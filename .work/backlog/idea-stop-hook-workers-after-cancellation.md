---
id: idea-stop-hook-workers-after-cancellation
kind: story
stage: backlog
tags: [perf, cleanup]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Stop hook workers after cancellation

Guarded executor workers continue dequeuing remaining handlers after caller cancellation; each fails closed through the aborted execution context and the overall result is correctly cancelled. During final cleanup, stop workers earlier without changing source-order diagnostics or cancellation semantics.
