---
id: gate-cruft-remove-compatibility-reexports
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

# Remove unused compatibility re-export shims

## Confidence
High

Delete `prepared-lifecycle-candidate-identifiers.ts` and `sqlite-lifecycle-state-inventory.ts` after confirming they have no source, test, package export, or documentation consumers. Existing authority modules remain unchanged.
