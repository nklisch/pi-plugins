---
id: idea-bind-subagent-qualification-digest-to-suite
kind: story
stage: backlog
tags: [compatibility, testing]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Bind the subagent qualification digest to suite evidence

The qualification digest currently binds capability evidence to registration evidence but is a committed receipt constant rather than a runtime recomputation of conformance vectors. Package bytes and semantics are independently verified. Consider generating or validating this digest from the qualification receipt during final hardening.
