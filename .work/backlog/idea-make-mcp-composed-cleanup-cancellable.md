---
id: idea-make-mcp-composed-cleanup-cancellable
kind: story
stage: backlog
tags: [reliability]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Make composed MCP cleanup cancellable

`createComposedMcpRuntime.close()` currently supplies a fresh non-cancellable signal to cleanup. A hung provider drain therefore cannot be interrupted by its caller. Preserve current cleanup ordering and ownership; revisit during the final cleanup phase with bounded cancellation semantics and tests.
