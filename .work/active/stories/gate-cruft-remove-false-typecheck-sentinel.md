---
id: gate-cruft-remove-false-typecheck-sentinel
kind: story
stage: implementing
tags: [cleanup, testing]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Remove the false test-typecheck participation sentinel

## Confidence
High

Delete `test/typecheck-participation.test.ts`, which checks only tsconfig JSON while `tsconfig.test.json` is not executed and currently fails independently. Stop claiming test TypeScript participation; retain the config only as non-authoritative groundwork unless a future real command repairs and owns it.
