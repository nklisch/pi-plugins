---
id: gate-cruft-remove-unused-imports
kind: story
stage: implementing
tags: [cleanup]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Remove compiler-proven unused imports

## Confidence
High

`tsc --noUnusedLocals --noUnusedParameters` reports 109 unused import specifiers across 58 production files. Remove only compiler-proven unused imports; preserve validation calls and side effects. Rerun strict unused diagnostics and full verification.
