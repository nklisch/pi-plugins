---
id: epic-foreign-plugin-model-source-materialization-review-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-secure-content-contract, epic-foreign-plugin-model-source-materialization-git-acquisition, epic-foreign-plugin-model-source-materialization-npm-acquisition, epic-foreign-plugin-model-source-materialization-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Harden Source Materialization Review Findings

## Scope

Resolve every accepted blocker and important finding from the source-materialization feature's two-phase deep review. Preserve the feature/lifecycle ownership boundary while making decompression accounting, staging ownership, source/content binding, filesystem persistence, memory, cancellation, credential behavior, manifest complexity, and adversarial coverage match the foundation guarantees.

## Required fixes

- Count every byte emitted by gunzip, including tar framing and PAX/GNU metadata, and enforce independent decompressed-stream and expansion-ratio limits before retained-file accounting. Add metadata bomb and boundary regressions.
- Bind every returned resolved source to its declaration and authoritative selectors; reject cross-kind, cross-origin/path/package/registry/subdirectory, or inconsistent SHA results.
- Replace freely pairable marketplace root/source/digest context with a verifiable marketplace materialization handoff, or otherwise prove the context digest against the source tree before copying.
- Add a public lifecycle-facing operation that securely rewalks and rehashes a materialized tree against its manifest; verify returned root is exactly `<slot>/content` and use disk-backed verification before handoff/promotion.
- Move all Git/npm scratch under caller-owned `<slot>/.work` through the secure session or a narrow caller-owned scratch port. Abort/finalize own cleanup and crash recovery can enumerate all paths.
- Replace single-call file writes with zero-progress-safe `writeAll`; hash bytes actually persisted and rehash from disk. Stream hardlink copies rather than `readFile`.
- Make command stream mode genuinely live and backpressured, with bounded capture, completion, cancellation, and consumer-abandonment behavior.
- Use incremental hashing so file writes/hardlinks do not accumulate whole-file buffers.
- Preserve primary acquisition/cancellation and cleanup failures together; kill process subtrees rather than only immediate Git processes where supported.
- Either support standard npm credential/config forms through a maintained parser or narrow the contract and make config read failures explicit. Correct token scopes containing ports.
- Bound and linearize public manifest verification with one normalized path map and explicit aggregate/path/entry limits.
- Expand committed adversarial coverage for sparse/PAX/GNU metadata, malformed numeric encodings, hardlink cycles/order, exact limits, cleanup failures, digest/source mismatches, and exact cross-platform root identity.
- Strip unknown packument fields after selected-field validation and replace substring root assertions with exact path checks.

## Acceptance criteria

- [ ] Compressed metadata/framing cannot bypass decompressed-byte or expansion-ratio limits.
- [ ] Declaration, context, resolved source, root, manifest, and on-disk bytes are cryptographically and structurally bound end to end.
- [ ] Every materializer-owned byte stays under the supplied private slot and all failure/cancellation paths clean or explicitly report it.
- [ ] Short writes, hardlinks, and hashing cannot produce a manifest for bytes not persisted.
- [ ] Git archive handling is genuinely streamed and bounded; file hashing is incremental.
- [ ] Primary and cleanup failures remain visible and Git descendants are terminated on cancellation.
- [ ] npm credential behavior exactly matches documented support and fails explicitly on unreadable configuration.
- [ ] Manifest verification is bounded and linear-time over accepted input.
- [ ] The adversarial matrix is executable and foundation docs describe actual behavior.
- [ ] Full `npm test`, build, boundaries, and compiled package import pass.
