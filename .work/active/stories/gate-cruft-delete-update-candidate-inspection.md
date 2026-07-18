---
id: gate-cruft-delete-update-candidate-inspection
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

# Delete unreachable update-candidate inspection module

## Confidence
High

Delete `src/application/update-candidate-inspection.ts` after confirming zero production, test, package-barrel, and documentation consumers. Preserve the active comparison and identity authority in `src/domain/update-policy.ts`.
