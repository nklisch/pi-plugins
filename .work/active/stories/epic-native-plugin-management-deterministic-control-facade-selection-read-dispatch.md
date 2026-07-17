---
id: epic-native-plugin-management-deterministic-control-facade-selection-read-dispatch
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-deterministic-control-facade
depends_on: [epic-native-plugin-management-deterministic-control-facade-contracts-registry, epic-native-plugin-management-deterministic-control-facade-lexer-parser-metadata]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
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
