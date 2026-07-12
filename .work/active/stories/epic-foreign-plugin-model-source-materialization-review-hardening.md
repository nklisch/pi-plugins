---
id: epic-foreign-plugin-model-source-materialization-review-hardening
kind: story
stage: done
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

- [x] Compressed metadata/framing cannot bypass decompressed-byte or expansion-ratio limits.
- [x] Declaration, context, resolved source, root, manifest, and on-disk bytes are cryptographically and structurally bound end to end.
- [x] Every materializer-owned byte stays under the supplied private slot and all failure/cancellation paths clean or explicitly report it.
- [x] Short writes, hardlinks, and hashing cannot produce a manifest for bytes not persisted.
- [x] Git archive handling is genuinely streamed and bounded; file hashing is incremental.
- [x] Primary and cleanup failures remain visible and Git descendants are terminated on cancellation.
- [x] npm credential behavior exactly matches documented support and fails explicitly on unreadable configuration.
- [x] Manifest verification is bounded and linear-time over accepted input.
- [x] The adversarial matrix is executable and foundation docs describe actual behavior.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Tar accounting now measures every decompressed byte, including headers, padding, global metadata, and framing, independently of retained payload bytes. Aggregate path limits are applied before manifest construction.
- Marketplace contexts are complete handoffs: verified source, complete manifest, root digest, and source/content binding are checked before copying. Application dispatch also checks resolved source kind, origin, path/package/registry, authoritative SHA, and exact `<slot>/content` identity.
- Git bare repositories and npm tarballs are created only below the secure session's `.work`. Git archives use a live bounded process stream; cancellation kills process groups where supported. File and hardlink writes use progress-checked loops, hash confirmed persisted bytes, and rewalk/re-hash from disk before success.
- The public `verifyMaterializedContent` operation gives lifecycle a disk-backed manifest recheck without exposing acquisition adapters. npm's documented credential surface is scoped `_authToken` (including ports) plus default `_auth`; unreadable config is explicit.
- Added executable regressions for metadata/framing limits, malformed numeric fields, hardlink ordering/cycles, cleanup aggregation, source/root mismatches, exact context roots, npm credential ports/config errors, and the live-stream completion contract. Foundation docs now describe the implemented handoff and scratch boundaries.

Verification: `npm test`; `npm pack --dry-run --json`; focused archive, source, process, HTTP, and package-import probes all pass.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane security-hardening story review. Independently confirmed `npm test`: 209 tests, typecheck, 152 dependency edges with no violations, build, and exact 94-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
