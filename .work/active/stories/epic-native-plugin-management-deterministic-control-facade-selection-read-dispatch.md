---
id: epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry, epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-18
---

# Implement Exact Selection and Read Dispatch

## Checkpoint

Resolve human plugin/scope selectors through coherent native inspection snapshots, preserve optional exact snapshot/detail/candidate selectors, and dispatch all pure/read commands through existing marketplace, inspection, update, operation-status, and host-status services.

## Files

- `src/application/native-control-selection.ts`
- `src/application/native-control-read-dispatch.ts`
- `src/application/native-control-projection.ts`
- focused selection, read dispatch, pagination, offline, and disclosure tests

## Acceptance evidence

- Zero/multiple/wrong-scope/wrong-subject/stale matches fail explicitly; names, list positions, display revisions, and notice text never become mutation authority.
- Update selection binds installed and candidate subjects from one coherent inspection snapshot and never falls forward to another available revision.
- Cursors and tokens remain opaque owner capabilities; the facade neither fabricates nor silently restarts pages.
- Offline stale data returns successful observations with warnings, while corrupt/unavailable authorities remain distinct and unrelated items survive.
- Read commands perform no hidden refresh, network, prompt, trust/config write, lifecycle call, timer start, or notification acknowledgment.

## Implementation notes

- Added exact installed/candidate selectors that use one inspection snapshot, reject zero/duplicate/wrong-subject/stale evidence, and preserve owner detail identifiers.
- Added coherent update selection over one mixed inspection page; supplied exact IDs must belong to that same snapshot.
- Added thin read dispatch for grammar/help, marketplace/adoption/catalog, installed inspection/diagnosis, updates, host status, and owner-routed operation polling/cancellation.
- Every owner DTO validates through its registry response schema before path/error/control-safe JSON disclosure projection; owner page cursors pass through unchanged.

## Verification

- `npm run typecheck`
- `npx vitest run test/application/native-control-selection.test.ts test/application/native-control-read-dispatch.test.ts test/application/native-control-projection.test.ts`
