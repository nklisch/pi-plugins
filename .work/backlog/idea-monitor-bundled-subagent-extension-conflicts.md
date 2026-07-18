---
id: idea-monitor-bundled-subagent-extension-conflicts
kind: story
stage: backlog
tags: [compatibility]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Monitor bundled subagent extension conflicts

The receipt-gated wrapper intentionally loads before the host extension. If a future subagent package changes its own `pi.extensions` contract, qualification must reject duplicate or conflicting registration before host startup. Keep this in package-upgrade acceptance.
