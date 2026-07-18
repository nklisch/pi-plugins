---
id: idea-document-subagent-package-probe-cache-lifetime
kind: story
stage: backlog
tags: [documentation, reliability]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Document subagent package probe cache lifetime

The production package probe caches its first promise for the process lifetime, which matches one qualification per process startup. Document that lifetime and first-signal binding during final cleanup so future callers do not infer per-call cancellation semantics.
