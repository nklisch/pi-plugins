---
id: idea-avoid-extra-session-resolution-on-hook-catalog-errors
kind: story
stage: backlog
tags: [perf]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Avoid extra session resolution on hook catalog errors

`hasMatchingSubagentHooks` intentionally fails safe by returning true when catalog inspection fails, which can cause one unnecessary session-resolution round trip before the selected plan fails closed. Preserve correctness; revisit only if measurement shows catalog errors are a meaningful hot path.
