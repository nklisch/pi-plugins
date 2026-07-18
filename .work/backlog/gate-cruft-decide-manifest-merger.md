---
id: gate-cruft-decide-manifest-merger
kind: story
stage: backlog
tags: [cleanup]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Decide whether to remove the standalone manifest merger

The 538-line manifest merger is imported only by its dedicated test; production uses bundle reconciliation. Removal changes a previously tested authority surface, so evaluate and confirm the guarantee before deleting it.
