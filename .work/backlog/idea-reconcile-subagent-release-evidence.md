---
id: idea-reconcile-subagent-release-evidence
kind: story
stage: backlog
tags: [compatibility, cleanup]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Reconcile subagent release evidence

The lifecycle capability reports the release tag and commit in separate fields while the package receipt also carries a combined tag/commit string. Exact package bytes are independently verified, so this is not a current activation risk. During final cleanup, derive both evidence views from one receipt and cross-check them explicitly.
