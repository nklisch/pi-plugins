---
id: idea-bound-native-cleanup-timeouts
kind: story
stage: backlog
tags: [reliability]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Bound native cleanup timeouts

Cleanup deliberately ignores caller cancellation so credentials and staging cannot be orphaned, but a hung future secret/content adapter could wedge shutdown indefinitely. Add owner-defined cleanup deadlines without permitting caller abort to bypass mandatory cleanup.
