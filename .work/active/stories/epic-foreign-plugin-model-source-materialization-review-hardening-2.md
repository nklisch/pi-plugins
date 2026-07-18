---
id: epic-foreign-plugin-model-source-materialization-review-hardening-2
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-foreign-plugin-model-source-materialization
depends_on: [epic-foreign-plugin-model-source-materialization-review-hardening]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-18
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

- [x] Exact npm and SHA-shaped Git selectors cannot resolve to a different immutable revision.
- [x] Relative/absolute slots bind to one canonical exact content root and reject forged sessions.
- [x] Cancellation terminates a non-cooperative archive read promptly without late rejection leaks.
- [x] Verification limits stop traversal/allocation before work beyond the configured threshold.
- [x] Path-scoped npm tokens select the longest matching scope and never leak cross-origin.
- [x] Node composition exposes a lifecycle-ready verifier without exposing crypto/filesystem internals.
- [x] Full `npm test`, build, boundaries, and compiled package import pass.

## Implementation notes

- Files changed: `src/application/ports/source-acquisition.ts`, `src/application/source-materialization.ts`, `src/domain/content-manifest.ts`, `src/infrastructure/archive/tar-reader.ts`, `src/infrastructure/filesystem/secure-content-writer.ts`, `src/infrastructure/http/bounded-fetch.ts`, `src/infrastructure/npm/npm-source-acquirer.ts`, `src/infrastructure/source/create-source-materializers.ts`, and the focused source-materialization tests.
- Tests added: exact npm selector binding, SHA-shaped Git selector and canonical relative-slot binding, forged session root rejection, non-cooperative archive cancellation/iterator cleanup, pre-hash tree entry limits, longest-match npm credential paths with ports, and the composed lifecycle verifier.
- Discrepancies from design: none.
- Adjacent issues parked: none.
- Reproduced findings before implementation: exact npm/Git selector mismatch acceptance, relative-slot forged-root acceptance, archive cancellation hanging on a pending `next()`, path token non-matching/first-match behavior, and the public verifier declaration's unexported incremental hash option. The early tree-limit probe also confirmed hashing occurred before the final entry-count rejection.
- Verification: `npm test` passed 26 files/229 tests, dependency boundaries (154 dependencies), build, and compiled package import; `npm run build && node test/compiled-package-import.mjs` passed independently. The public declaration now exposes only lifecycle verifier options and the Node composition returns a bound verifier.

## Review (2026-07-12)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none

**Notes**: Fast-lane selector/slot/cancellation hardening review. Independently confirmed `npm test`: 229 tests, typecheck, 154 dependency edges with no violations, build, and exact 94-export compiled package import. Verdict: Approve - story verified by implement; fast-lane advance.
