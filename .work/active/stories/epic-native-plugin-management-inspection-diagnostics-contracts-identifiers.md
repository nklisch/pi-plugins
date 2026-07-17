---
id: epic-native-plugin-management-inspection-diagnostics-contracts-identifiers
kind: story
stage: done
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

## Implementation notes

- Added strict schema-derived list/detail/diagnosis contracts plus the service boundary and the diagnostic variant registry used by those contracts.
- Detail IDs and cursors use canonical JSON, canonical base64url, SHA-256 checksums, and constant-time checksum comparison. Payload schemas contain only scope-qualified safe identifiers.
- Snapshot and filter IDs derive from canonical evidence, making object insertion order irrelevant while preserving array order where it is authoritative.
- Verification: `npm run typecheck`; focused Vitest contract/identifier suites (6 tests).
- Execution capability: GPT-5.6 Sol, xhigh, single cohesive feature owner as explicitly requested; no nested agents.
