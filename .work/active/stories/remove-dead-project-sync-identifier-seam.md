---
id: remove-dead-project-sync-identifier-seam
kind: story
stage: review
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Remove the Dead Project-Sync Identifier Seam

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** elimination / dead weight / confused ownership

Delete an unreferenced forwarding module that gives project-sync identifiers a second apparent owner. The three identifiers are implemented in `native-lifecycle-operation-identifiers.ts`, imported from that module by every production and test consumer, and exported publicly from `src/index.ts` through that same canonical owner.

## Files

- `src/application/project-sync-identifiers.ts` (delete)

## Current State

`src/application/project-sync-identifiers.ts` contains only this forwarding seam:

```ts
export {
  deriveProjectIntentObservationId,
  deriveProjectSyncActionId,
  deriveProjectSyncConflictId,
} from "./native-lifecycle-operation-identifiers.js";
```

Repository-wide reference search finds no import of `project-sync-identifiers`; the only textual mention is historical file-list prose in the lifecycle-sync feature body. Runtime consumers, focused identifier tests, and package exports all reference `native-lifecycle-operation-identifiers.ts` directly.

## Target State

Delete `src/application/project-sync-identifiers.ts`. Keep the implementations and all existing imports/exports unchanged in `src/application/native-lifecycle-operation-identifiers.ts` and `src/index.ts`.

## Implementation Notes

- Repeat the executable import search immediately before deletion.
- Delete only the dead forwarding file; do not move or rename identifier implementations.
- Do not alter identifier tags, digest evidence, schemas, package exports, project-intent file behavior, sync planning, or tests.
- Leave historical substrate prose intact; it records the original implementation rather than serving as an executable dependency.

## Acceptance Criteria

- [ ] `src/application/project-sync-identifiers.ts` is deleted.
- [ ] No executable source, test, or package entry imports that path before or after deletion.
- [ ] `deriveProjectIntentObservationId`, `deriveProjectSyncActionId`, and `deriveProjectSyncConflictId` retain their existing implementations and public exports.
- [ ] Typecheck and compiled-package import verification pass unchanged.
- [ ] The implementation is a one-file net deletion with no public contract or runtime behavior change.

## Risk and Rollback

Risk is low because the module has no executable consumer and is not a package export path. A hidden deep import outside this repository would already target an unpublished internal source path rather than the package contract; no compatibility shim is warranted. Revert the deletion commit to restore the forwarding file if an in-repository reference appears before implementation.

## Implementation notes

- Execution capability: GPT-5.6 Sol, direct inline implementation; this is a one-file deletion with an already-proven canonical owner, and the caller prohibited nested agents.
- Review weight: standard (project default); standalone-story policy uses one bounded inline pass regardless of weight.
- Files changed: deleted `src/application/project-sync-identifiers.ts` (5 lines); the production diff is one file, 0 insertions, 5 deletions, net 5 lines deleted.
- Tests added/removed: none; existing focused identifier and compiled-package import checks protect the unchanged canonical implementations and public exports.
- Simplification: removed the unreferenced forwarding module and no other source, import, export, schema, contract, or test.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification

- Pre- and post-deletion tracked executable/config searches found no static, dynamic, package-entry, test, or tooling reference to `project-sync-identifiers`; mentions are limited to this work record and intentionally retained historical substrate prose.
- A clean build produced no compiled `project-sync-identifiers` module or reference. `dist/index.js`, `dist/index.d.ts`, and the canonical module's JavaScript/declarations still export all three identifiers directly from `native-lifecycle-operation-identifiers`.
- `src/application/native-lifecycle-operation-identifiers.ts` and `src/index.ts` remained byte-for-byte unchanged (SHA-256 `fdb2cb697afff77c087c30ee83092259392072005efbd329180657bb5708a853` and `3c9c2f1ec28c40c8e58894b0fb5fbadad693beba8e885b7d9e13458c91e6da9d`).
- `npx vitest run test/application/native-lifecycle-operation-identifiers.test.ts` — passed (3 tests).
- `npm run typecheck && npm run build && node test/compiled-package-import.mjs` — passed; compiled root package import reported 711 exports.
- `npm test` — passed: typecheck, dependency boundaries (336 modules / 2,412 dependencies), 260 test files / 1,287 tests with no type errors, package build, compiled root package import (711 exports), compiled Pi package import (3 exports), and isolated packed Pi extension startup.
