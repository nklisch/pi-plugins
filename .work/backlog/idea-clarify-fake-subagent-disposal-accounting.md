---
id: idea-clarify-fake-subagent-disposal-accounting
kind: story
stage: backlog
tags: [cleanup, testing]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Clarify fake subagent disposal accounting

The test fake caps `sessionDisposeCount` at one, matching the exactly-once contract but making repeated-disposal diagnostics less obvious. Consider clearer test-only accounting during the final cleanup phase; production behavior is unaffected.
