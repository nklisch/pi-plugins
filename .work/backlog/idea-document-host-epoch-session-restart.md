---
id: idea-document-host-epoch-session-restart
kind: story
stage: backlog
tags: [documentation]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Document host-epoch workflow restart behavior

A full Pi process restart rotates `hostEpoch`, invalidating predecessor install/lifecycle workflow tokens while durable trust, configuration, content, and lifecycle authorities survive. Add one explicit architecture note that users reopen the workflow from inspection after restart.
