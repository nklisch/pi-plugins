---
id: remove-dead-marketplace-refresh-scaffolding
kind: story
stage: implementing
tags: [refactor, infra]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Remove Dead Marketplace Refresh Scaffolding

## Brief

`src/application/marketplace-refresh-service.ts` retains private scaffolding that has no caller and contributes no behavior:

- `successRecord` at `src/application/marketplace-refresh-service.ts:123-139` is never referenced; publication builds the success record inline at line 257 instead.
- Its `RefreshClaimId` type import is therefore dead.
- `MarketplaceRefreshMemorySchema`, `deriveUpdateCandidateKey`, and `GenerationSchema` at lines 4, 6, and 12 are unused.
- `candidateNotifications` allocates and returns an `intents` array at lines 154-180 that is always empty and whose returned value is never read.

Delete only this proven-private dead code and simplify `candidateNotifications` to return the record and outcomes it actually computes.

## Value

**Priority:** Medium  
**Risk:** Low  
**Source lens:** elimination / dead weight

This removes a misleading second success-record path and an impossible notification output from the core refresh service, reducing the number of apparent state transitions an implementer must audit.

## Acceptance Criteria

- [ ] `successRecord` and its import fallout are absent.
- [ ] `candidateNotifications` exposes only live outputs; refresh publication and emitted automatic-update notifications are unchanged.
- [ ] No exported refresh service, dependency, request, result, policy, or package contract changes.
- [ ] Marketplace refresh/update focused tests, typecheck, and dependency boundaries pass unchanged.

## Risk and Rollback

Risk is limited to accidentally deleting an import with a live type use or changing the later automatic-notification `intents` array. Re-run symbol search before deletion and keep the live array at the automatic-application path (`src/application/marketplace-refresh-service.ts:275-314`). Revert the implementation commit to restore the private scaffolding.
