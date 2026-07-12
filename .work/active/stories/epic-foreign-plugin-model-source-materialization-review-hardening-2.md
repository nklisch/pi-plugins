---
id: epic-foreign-plugin-model-source-materialization-review-hardening-2
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-review-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Close Selector, Slot, and Cancellation Boundaries

## Scope

Close residual source-materialization failures reproduced after the primary security hardening pass.

## Required fixes

- Bind authoritative selectors end to end: an exact npm selector must equal the resolved version; a Git `ref` that is a full commit SHA must equal the selected revision. Preserve existing separate `sha` precedence and range/tag resolution semantics.
- Canonicalize and bind the supplied staging slot before opening a content session. A session result must prove its root is exactly the canonical `<slot>/content`; relative slots and forged adapter roots fail closed.
- Make archive reads promptly cancellable even when an input iterator's `next()` never settles. Race pending reads against abort, terminate/return the iterator, and prevent unhandled late rejections.
- Enforce manifest/tree entry and aggregate-path limits during traversal and before expensive hashing/allocation or full schema work where structurally possible.
- Support standard path-scoped npm `_authToken` keys, including ports, with longest applicable path scope; keep cross-origin redirect stripping and explicit config errors.
- Keep SHA-256 infrastructure private by returning a lifecycle-ready bound disk verifier from `createNodeSourceMaterializers` or an equivalently narrow composed boundary.

## Acceptance criteria

- [ ] Exact npm and SHA-shaped Git selectors cannot resolve to a different immutable revision.
- [ ] Relative/absolute slots bind to one canonical exact content root and reject forged sessions.
- [ ] Cancellation terminates a non-cooperative archive read promptly without late rejection leaks.
- [ ] Verification limits stop traversal/allocation before work beyond the configured threshold.
- [ ] Path-scoped npm tokens select the longest matching scope and never leak cross-origin.
- [ ] Node composition exposes a lifecycle-ready verifier without exposing crypto/filesystem internals.
- [ ] Full `npm test`, build, boundaries, and compiled package import pass.
