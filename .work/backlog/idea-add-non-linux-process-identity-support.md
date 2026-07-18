---
id: idea-add-non-linux-process-identity-support
kind: story
stage: backlog
tags: [compatibility, reliability]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Add non-Linux process identity support

PID start-token classification currently uses Linux `/proc`; other platforms report the capability unavailable rather than guessing. Investigate supported macOS and Windows process-birth identities while preserving fail-closed owner-death classification.
