---
id: gate-cruft-decide-skill-resource-adapter
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

# Decide whether to remove the standalone skill-resource adapter

`registerSkillResourceDiscovery` has no production caller because packaged-host delegates own registration. Decide whether its standalone lifetime/error contract remains a supported seam before deleting the adapter and dedicated tests.
