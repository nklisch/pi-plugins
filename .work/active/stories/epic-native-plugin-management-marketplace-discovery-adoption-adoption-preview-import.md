---
id: epic-native-plugin-management-marketplace-discovery-adoption-adoption-preview-import
kind: story
stage: implementing
tags: [compatibility]
parent: epic-native-plugin-management-marketplace-discovery-adoption
depends_on: [epic-native-plugin-management-marketplace-discovery-adoption-registration-service, epic-native-plugin-management-marketplace-discovery-adoption-source-foreign-boundaries]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-17
updated: 2026-07-17
---

# Add read-only foreign registration preview and import

## Checkpoint

Evolve existing adoption discovery into explicit preview against native current-scope source identities and one-way import through the normal registrar. Foreign aliases remain provenance only; import re-reads fixed documents and cannot import caches, installations, trust, credentials, or activation.

## Files

- `src/domain/adoption.ts`
- `src/application/adoption-contract.ts`
- `src/application/adoption-service.ts`
- `src/composition/create-adoption-service.ts`
- focused adoption domain/application/integration tests

## Acceptance evidence

- Preview is network-free and mutation-free, merges equivalent Claude/Codex declarations deterministically, and reports already-registered exact scopes or not-registered.
- Missing/corrupt/changed/conflicting documents preserve valid siblings and safe fixed logical provenance.
- Import re-discovers candidates, rejects stale IDs and non-portable/untrusted project sources, and passes source-bound adoption provenance through normal add.
- Repeated import is unchanged; authoritative root-name conflict remains registrar-owned; partial outcomes are sorted and exact.
- Cancellation reports only proven commits, marks unstarted candidates, and never writes any foreign path.
- Clean operation requires neither Claude nor Codex CLI and reads no foreign cache/auth/trust/install path.
