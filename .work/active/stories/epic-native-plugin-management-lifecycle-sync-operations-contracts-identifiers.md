---
id: epic-native-plugin-management-lifecycle-sync-operations-contracts-identifiers
kind: story
stage: done
tags: [compatibility]
parent: epic-native-plugin-management-lifecycle-sync-operations
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Define Lifecycle/Sync Operation Contracts and Identifiers

## Checkpoint

Implement the schema-derived public boundary in `src/application/native-lifecycle-operation-contract.ts`, `src/application/native-lifecycle-operation-identifiers.ts`, and `src/application/project-sync-contract.ts`. One registry owns operation, phase, outcome, stale/conflict/rejection, sync-action, and required-action variants. Add strict request, preview/session, confirmation, progress, effects, result, status, and cancellation schemas plus host-epoch token/preview/action/conflict/file-observation IDs.

Export only safe application contracts from `src/index.ts`; no raw snapshots, records, paths, file identities/bytes, roots, values, locators, causes, or internal capabilities.

## Acceptance evidence

- Strict schema tables reject unknown/impossible variants, wrong confirmation pairings, duplicate resolutions, forged/oversized IDs, unsafe progress/effects, and sensitive/path/native-cause canaries.
- Identifier tests prove binding across host/project/capability epoch, scope, target generation/revision/activation/digest, candidate, file observation, mode, plan/actions/conflicts, and desired digest.
- Deterministic preview/apply and explicit-provider run signatures typecheck from packed exports.
- Public/source/compiled export allowlists remain exact.

## Implementation notes

- Added the schema-inferred operation, sync-plan, confirmation, progress, effect, result, session, status, and cancellation contracts plus the shared prepared-candidate alias.
- Added host-epoch session tokens and domain-separated preview, file-observation, action, and conflict identifiers. Preview identity accepts only caller-supplied safe evidence and binds every captured authority field through canonical JSON.
- Kept boundary objects strict and added cross-field refinements for operation pairing, duplicate resolutions, monotonic progress, disjoint effects, and lifecycle-versus-sync result evidence.
- Verification: `npx tsc -p tsconfig.json --noEmit --pretty false`; 5 focused tests passed.
