---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-review-hardening
kind: story
stage: implementing
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: [epic-transactional-plugin-lifecycle-recovery-journal-gc-integration-hardening]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Verify crash durability and close the collection lease race

## Review blocker

The standard feature review found two material gaps at the recovery feature boundary:

1. Real crash/restart and cross-process acceptance is not exercised. Add purposeful child-process fixtures/tests covering journal death before and after acknowledged prepare, concurrent exact prepare convergence and conflicting evidence isolation, a live two-process revision lease preventing collection, and state pruning before physical deletion. Tests must use the real Node adapters and temporary roots; do not satisfy this checkpoint with only fakes or single-process mocks.
2. `RevisionCollectionService` uses the retained state/lease set captured before state pruning when it physically deletes from the fresh artifact scan. Refresh authoritative state and live/unknown lease references after pruning and before deletion; incomplete/corrupt refreshed evidence must defer deletion. A newly acquired ordinary-session lease must pin its artifact.

## Constraints

- Preserve one shared reconciler, journal/state schemas, persisted formats, process-owner semantics, public exports, grace policy, and generic-GC exclusion of persistent data/configuration/secrets.
- Do not restore the deleted orphan fixture unchanged; add only fixtures directly invoked by tests.
- Keep state/journal/lease discovery fail-closed. `unknown` owner remains retained.
- State pruning still precedes physical deletion, and the final deletion candidate still revalidates physical identity.
- Use the current cadence-refactored process identity utility; do not reintroduce duplicate `/proc` parsing.
- No second independent review pass: this is the named fix set from the one permitted standard pass.

## Acceptance evidence

- [ ] Child death before prepare acknowledgment leaves no readable transition row; death after acknowledgment survives restart as one digest-valid row.
- [ ] Two processes preparing identical evidence converge idempotently; conflicting evidence never overwrites accepted evidence and remains isolated/fail-closed.
- [ ] A lease held by another live process prevents pruning/deletion; release or proven death plus the configured complete-scan grace is required before collection.
- [ ] Collection proves the installed-state revision record is pruned before physical removal.
- [ ] A lease acquired after the initial inventory but before deletion is observed by the refreshed retained set and prevents removal.
- [ ] Incomplete refreshed state or lease evidence performs no physical deletion.
- [ ] Focused crash/concurrency tests and full `npm test` pass with unchanged public exports and dependency boundaries.
