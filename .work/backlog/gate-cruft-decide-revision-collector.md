---
id: gate-cruft-decide-revision-collector
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

# Decide whether to schedule or remove revision collection

Packaged composition constructs a revision collection service but never calls `collect()`. Decide whether to add a production trigger or remove the collector, retention plumbing, public exports, and tests; disk reclamation guarantees require explicit ownership.
