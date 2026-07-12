---
id: epic-foreign-plugin-model-marketplace-ingestion
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Claude and Codex Marketplace Ingestion

## Brief

Read `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` catalogs as untrusted input and emit canonical marketplace identities and normalized plugin entries with source claims. The capability handles each format's source declarations, versions, availability policy, entry-level component declarations, strictness semantics, and precise source-located validation errors while isolating malformed entries where marketplace identity remains trustworthy.

When both catalogs exist, overlapping identities and entries are validated together: equivalent declarations collapse, complementary metadata combines, and disagreement fails explicitly without host precedence. This feature normalizes catalog intent only; secure acquisition is supplied independently, while plugin manifests and complete compatibility are handled after content materialization.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: parallel producer after the canonical contracts; plugin-bundle ingestion consumes its normalized entry and provenance
- Design alignment: preserve dual-format consistency, authoritative marketplace-entry identity, and source-located failures from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Marketplace sources; Marketplace entries; Plugin identity
- `docs/ARCHITECTURE.md` — Format ingestion; Reader isolation; Dual manifests
- `docs/COMPATIBILITY.md` — Marketplace discovery; Marketplace behavior; Plugin source forms

<!-- The feature-design pass will fill in interfaces, signatures, and implementation units. -->
