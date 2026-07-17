---
id: idea-production-projection-publication
kind: story
stage: implementing
tags: [bug, compatibility]
parent: epic-native-plugin-management-clean-environment-core-e2e
depends_on: [idea-fix-packed-candidate-inspection]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Publish production runtime projections atomically

## Original finding

The packed production host cannot activate an otherwise compatible skill/hook plugin because runtime projection publication calls the Node platform's unavailable direct directory `renameNoReplace` capability. The signed Pi-manager packed acceptance already reproduces the exact public `PROJECTION_FAILED` result; the clean-environment core E2E requires the same real path to complete install, enable, update, uninstall, project-sync activation, lifecycle crash recovery, and installed-state chaos journeys.

The clean E2E keeps successful activation/resource/restart assertions as expected failures linked to this item. Any fix must preserve atomic no-replace projection visibility and must not substitute the test-only check-then-rename helper or a fake production platform.

## Fix contract

- Reach the projection boundary from a successful packed install baseline independent of candidate inspection assertions.
- Reuse a supported platform capability to publish immutable projections atomically without replacement; fail closed where unavailable.
- Preserve projection identity, complete-tree visibility, durability, concurrent-winner validation, and staging cleanup.
- Prove install, independent reload, tamper isolation, lifecycle update/removal, project activation, and crash recovery through packed Pi outcomes.
