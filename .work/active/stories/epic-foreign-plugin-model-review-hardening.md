---
id: epic-foreign-plugin-model-review-hardening
kind: story
stage: implementing
tags: [compatibility, security, tests]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-marketplace-ingestion, epic-foreign-plugin-model-source-materialization, epic-foreign-plugin-model-plugin-bundle-ingestion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Enforce Pinned Git Revision at Inspection Handoff

## Scope

Close the cross-feature source-binding bypass found by epic certification.

## Required fixes

- Make inspection source matching use the same authoritative Git selector precedence as materialization for both `git` and `git-subdir` sources:
  1. when `declared.sha` exists, require `resolved.revision === declared.sha`;
  2. otherwise, when `declared.ref` is a full 40-hex SHA, require `resolved.revision === declared.ref`;
  3. otherwise accept the immutable revision selected from the named ref by materialization.
- A non-authoritative conflicting SHA-shaped `ref` must never override or provide an alternate match when `sha` is present.
- Preserve URL, subdirectory, source-kind, and materialization binding checks.
- Add inspection-service and end-to-end regressions for both source kinds, SHA-ref-only mismatch, explicit-SHA precedence, valid exact pins, and named refs.

## Acceptance criteria

- [ ] Git and git-subdir SHA-shaped refs cannot inspect a different resolved revision.
- [ ] Explicit `sha` wins over a conflicting `ref`; only the SHA revision is accepted.
- [ ] Named refs remain valid after materialization resolves them immutably.
- [ ] Content/source binding and all other source comparisons remain intact.
- [ ] Full `npm test`, build, boundaries, and exact compiled package import pass.
