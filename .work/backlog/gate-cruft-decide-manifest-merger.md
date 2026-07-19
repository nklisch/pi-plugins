---
id: gate-cruft-decide-manifest-merger
kind: story
stage: backlog
tags: [cleanup]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-19
---

# Decide whether to remove the standalone manifest merger

The 538-line manifest merger is imported only by its dedicated test; production uses bundle reconciliation. Removal changes a previously tested authority surface, so evaluate and confirm the guarantee before deleting it.

## 2026-07-19 update

The decision is now clear-cut: the standalone merger still encodes the OLD
fatal-conflict semantics (description/version/name/locator CLAIM_CONFLICTs)
that production abandoned in favor of precedence-based resolution. It is
imported only by its own test, exported nowhere, and its tests assert behavior
that is now explicitly wrong. Recommend deleting
`src/formats/manifest-merger.ts` + `test/formats/manifest-merger.test.ts` at
the next maintainer-approved cleanup (agent tooling blocked programmatic
deletion).
