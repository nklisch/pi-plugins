---
id: idea-update-stale-subagent-boundary-package-name
kind: story
stage: backlog
tags: [cleanup, compatibility]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Update the stale subagent boundary package name

One dependency-cruiser rule still names `@gotgenes/pi-subagents`; the complementary confinement rule correctly names `@nklisch/pi-subagents`, so no enforcement gap exists. Update the stale dead pattern during final cleanup without changing package boundaries.
