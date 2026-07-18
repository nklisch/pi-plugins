---
id: gate-cruft-delete-unreachable-declarations
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

# Delete unreachable private declarations

## Confidence
High

Delete the compiler-proven unreachable private declarations in configuration-service, discovery-plan, inspection-service, compatibility-evaluator, configured-values, installed-state, and command-runner, plus imports made unused. Preserve every reachable validation and public contract.
