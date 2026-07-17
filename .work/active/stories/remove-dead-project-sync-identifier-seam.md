---
id: remove-dead-project-sync-identifier-seam
kind: story
stage: implementing
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
