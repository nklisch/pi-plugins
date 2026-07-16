---
id: centralize-adoption-candidate-id-derivation
kind: story
stage: done
tags: [refactor, compatibility]
parent: null
depends_on: []
release_binding: null
gate_origin: refactor-design
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Centralize Adoption Candidate ID Derivation

## Value

**Priority:** Medium
**Risk:** Low
**Source lens:** pattern drift / dead weight

Route reconciled candidates through the existing candidate-ID constructor instead of maintaining a second copy of the versioned hash grammar. Remove the reconciler's ignored equality parameter at the same time so its private merge helper advertises only behavior it actually performs.

## Evidence

- `src/domain/adoption.ts:72-79` defines and publicly exports `deriveAdoptionCandidateId`, including the `adoption-v1:` prefix and canonical-source hashing contract.
- `src/domain/adoption.ts:220` reconstructs that same prefix, canonical parse, and hash directly in the production reconciliation path rather than calling the constructor.
- `src/domain/adoption.ts:136-139` accepts an `equals` callback that is never read; callers at lines 207-208 and 217 pass source and alias equality functions with no effect.
- Reconciliation already groups source claims by `serializeMarketplaceSource` and alias claims by alias value before merging (`src/domain/adoption.ts:193-217`), so removing the ignored callbacks does not remove an equality guard.
- `test/domain/adoption.test.ts:13-18,29-49` protects the versioned ID contract and deterministic reconciliation, while `test/formats/adoption-reconciler.test.ts:9-24` protects equivalent cross-host source merging.

## Target State

```ts
function mergeClaims<T>(
  claims: readonly ClaimLike<T>[],
): ClaimLike<T> {
  // Existing deterministic provenance merge remains unchanged.
}

const source = mergeClaims(ordered.map((entry) => entry.source));
// ...
const suggestedMarketplaces = [...aliases.entries()]
  .sort(/* unchanged */)
  .map(([, claims]) => mergeClaims(claims));

return AdoptionCandidateSchema.parse({
  id: deriveAdoptionCandidateId(source.value, sha256),
  source,
  suggestedMarketplaces,
  nativeHosts,
});
```

Remove the now-unused `CanonicalSourceSchema` import. Do not alter grouping, conflict detection, provenance ordering/deduplication, candidate ordering, hash injection, schemas, or public exports.

## Acceptance Criteria

- [ ] `reconcileAdoptionDeclarations` obtains every candidate ID through `deriveAdoptionCandidateId`; only that constructor owns the `adoption-v1:` candidate-ID hash grammar.
- [ ] `mergeClaims` has no unused equality parameter, and both callers retain their existing source/alias grouping before merging.
- [ ] Reconciled candidates, diagnostics, provenance order, aliases, host order, and serialized IDs are byte-for-byte unchanged for existing vectors.
- [ ] Adoption domain/reconciler tests, typecheck, dependency boundaries, build, and package export checks pass without adding tests for this mechanical refactor.

## Risk and Rollback

Risk is low because both current ID expressions hash the same canonical `source.value`, and the removed callbacks are currently unreachable behavior. Revert this story's implementation commit to restore the duplicated expression and inert parameters; there is no state or migration effect.

## Implementation notes

- Routed reconciled candidate IDs through `deriveAdoptionCandidateId(source.value, sha256)` and removed the duplicate `CanonicalSourceSchema`/hash-prefix expression.
- Removed the unused `equals` callback from `mergeClaims` and both callers; source and alias grouping remain unchanged and continue to establish equivalence before merging provenance.
- Focused verification passed: 6 adoption domain/reconciler tests and TypeScript typecheck.
- Execution capability: direct host implementation; the change is one mechanical standalone-story unit with an obvious bounded diff.

## Review (2026-07-16)

**Verdict**: Approve

**Blockers**: none
**Important**: none
**Nits**: none
**Rejected**: none

**Notes**: Bounded inline standalone-story review; no independent or cross-model reviewer by policy. The diff removes only the duplicate candidate-ID expression and ignored callback, preserves source/alias grouping and provenance order, and routes the exact same normalized source through the authoritative constructor. Full `npm test` passes: typecheck, boundaries, 113 files / 616 tests, build, and 407 compiled exports.
