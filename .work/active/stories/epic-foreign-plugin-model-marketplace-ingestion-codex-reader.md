---
id: epic-foreign-plugin-model-marketplace-ingestion-codex-reader
kind: story
stage: implementing
tags: [compatibility]
parent: epic-foreign-plugin-model-marketplace-ingestion
depends_on: [epic-foreign-plugin-model-marketplace-ingestion-domain-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read Codex Marketplace Catalogs

## Scope

Implement the pure Codex catalog reader described in the parent. Parse native `.agents/plugins/marketplace.json` catalogs plus documented Claude-compatible string-path entries, map installation policy exactly, synthesize manifest-required/catalog-supplemental authority with provenance, and retain presentation, runtime, and dependency declarations without assigning compatibility verdicts.

Share pure path and JSON Pointer support with the Claude reader; do not import the Claude host reader itself. Do not read `.codex/config.toml`, inspect manifests, access materialized paths, or depend on Node/infrastructure.

## Acceptance criteria

- [ ] Native local and Git-subdirectory sources plus Claude-compatible string paths map into shared declared-source claims.
- [ ] `AVAILABLE`, `INSTALLED_BY_DEFAULT`, and `NOT_AVAILABLE` map exactly; missing or unknown installation policy drops only the affected entry.
- [ ] Every entry carries valid Codex authority and cannot carry Claude strictness.
- [ ] Root-fatal, entry-recoverable, no-partial-entry, path syntax, raw declaration, and JSON Pointer behavior match the shared contract.
- [ ] Runtime/dependency declarations and host-qualified presentation metadata remain available for later bundle/compatibility policy.
- [ ] Native, Claude-compatible, and adversarial fixture suites pass without Node or outer-layer imports.

## Design source

Implement Parent Feature Unit 3. If verified Codex fixtures differ from the surveyed schema, preserve the shared output and document the evidence and narrowly added reader variant here rather than weakening root identity or entry atomicity.
