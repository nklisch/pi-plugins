---
id: idea-centralize-subagent-continuation-budget
kind: story
stage: backlog
tags: [cleanup]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Centralize the subagent continuation budget

The production wrapper and composition both encode the value `3`. They currently agree and drift fails closed, so defer this behavior-preserving cleanup until the final refactor phase. Use `HOOK_SUBAGENT_CONTINUATION_BUDGET` as the single source of truth without changing registration or package qualification semantics.
