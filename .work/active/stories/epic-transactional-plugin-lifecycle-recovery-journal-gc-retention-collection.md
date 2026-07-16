---
id: epic-transactional-plugin-lifecycle-recovery-journal-gc-retention-collection
kind: story
stage: done
tags: [security, infra, tests]
parent: epic-transactional-plugin-lifecycle-recovery-journal-gc
depends_on: [epic-transactional-plugin-lifecycle-recovery-journal-gc-reconciliation-contracts, epic-transactional-plugin-lifecycle-recovery-journal-gc-durable-journal-adapter]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Retain Live Revisions and Collect Proven Garbage

## Checkpoint

Implement closed-world retained-root computation, process-liveness revision leases, persistent first-unreferenced aging, exact inactive-state revision pruning, opaque physical artifact deletion, and the separate explicit uninstall cleanup path. Generic revision GC must be structurally unable to delete persistent data, configuration, or secrets.

## Required files

- `src/domain/content-store.ts`
- `src/application/revision-collection-service.ts`
- `src/application/confirmed-uninstall-cleanup.ts`
- `src/application/ports/revision-artifact-store.ts`
- `src/application/ports/revision-lease-store.ts`
- `src/application/ports/revision-retention-store.ts`
- `src/application/ports/persistent-data-removal.ts`
- recovery/filesystem adapters and focused tests named in the parent design

## Constraints

- A destructive pass requires complete state-scope discovery and authoritative reads, journal inventory, lease inventory, retention ledger, and physical scan. Any gap defers ready-content deletion.
- Retain every state revision/marketplace, nonterminal transition state/projection, and live/unknown lease across all scopes. Derive physical keys only from verified evidence.
- Remove inactive revision records first through `GenerationMutationCoordinator` with exact target/pending checks; selected revisions and changed/stale targets remain.
- First-unreferenced age begins only after a complete scan, resets on reference, persists across restart, and defaults to 24 hours. Terminal journal residue remains seven days after collection completion.
- Physical removal accepts only scanner-issued root/inode/metadata-bound capabilities and revalidates immediately before no-follow deletion.
- `delete-confirmed` uses a separate opaque plan after terminal uninstall, no lease, grace, descriptor reconstruction, and configuration/secret retirement. `keep` cannot reach it; generic artifacts have no data-root variant.

## Acceptance evidence

- [ ] Shared content remains while referenced by any user/project scope, pending journal, or live/unknown session.
- [ ] Nonselected revisions are state-pruned before physical deletion, and lifecycle races defer through stale/exact-target checks.
- [ ] Incomplete/corrupt inventories perform no ready-content deletion; repeated complete scans and grace are required.
- [ ] Forged/stale/path-swapped candidates are refused and partial deletions retry idempotently.
- [ ] Persistent data/configuration/secrets never enter generic GC; explicit keep/delete-confirmed and partial cleanup cases preserve their guarantees.
- [ ] Journal/retention pruning occurs last and only after all required cleanup evidence is complete.

## Ordering

Consumes the common contracts and durable journal. It can proceed alongside startup recovery after those dependencies; final integration joins both checkpoints.

## Implementation notes

Implemented the closed-world collection contracts and application mark/sweep service. Retained roots are restricted to validated marketplace/plugin store keys and projection references; persistent data has no generic artifact variant. State, nonterminal journal evidence, live/unknown process leases, retention marks, and complete artifact scans are required before deletion. Nonselected revisions are removed through generation-coordinated exact-target mutations before a fresh scan, and physical deletion uses scanner-issued opaque capabilities. Added a separate confirmed-uninstall cleanup service in which `keep` exits before configuration/data calls and partial configuration failure retains data.

Infrastructure now includes a durable SQLite retention ledger, PID plus process-start-token leases with explicit release and no heartbeat takeover, and a ready-root/inode-revalidated artifact scanner that never traverses the data root.

Verification evidence:

- `npm run typecheck` — passed.
- `npm run test:unit -- --run test/application/revision-collection-service.test.ts test/application/confirmed-uninstall-cleanup.test.ts test/infrastructure/recovery/process-revision-leases.test.ts test/infrastructure/recovery/revision-artifact-store.test.ts` — 4 files / 6 tests passed.
- Tests cover incomplete-scope deferral before deletion, the closed artifact union without data roots, keep/partial confirmed cleanup, live lease pinning, and immutable-root-only scanning.
