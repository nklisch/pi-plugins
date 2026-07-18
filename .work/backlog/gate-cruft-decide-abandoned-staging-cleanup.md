---
id: gate-cruft-decide-abandoned-staging-cleanup
kind: story
stage: backlog
tags: [cleanup, reliability]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Decide whether to activate or remove abandoned-staging cleanup

The recovery artifact scanner and optional recovery branch are dormant in production. Decide whether 0.x should activate abandoned-staging cleanup or remove the port, scanner, public exports, branch, and tests; public recovery-artifact compatibility must be an explicit choice.
