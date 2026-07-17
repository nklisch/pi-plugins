---
id: epic-native-plugin-management-inspection-diagnostics-contracts-identifiers
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-inspection-diagnostics
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Define native inspection contracts and identifiers

## Checkpoint

Create the strict schema-derived list/detail/diagnosis surface, snapshot/detail/cursor identifiers, and `NativeInspectionService` boundary described in the parent feature. IDs must be stateless, checksum-verified, snapshot-bound, and scope-qualified without embedding source, path, command, endpoint, or diagnostic text.

## Files

- `src/application/native-inspection-contract.ts`
- `src/application/native-inspection-identifiers.ts`
- `src/index.ts`
- `test/application/native-inspection-contract.test.ts`
- `test/application/native-inspection-identifiers.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Acceptance evidence

- Strict schemas reject unknown/impossible/oversized values.
- Detail IDs separate installed/candidate and user/project/revision/snapshot identities.
- Cursor replay against changed filters or snapshots returns stale/invalid without persisted cursor state.
- Public and compiled exports expose only intended schema-inferred contracts and factories.
