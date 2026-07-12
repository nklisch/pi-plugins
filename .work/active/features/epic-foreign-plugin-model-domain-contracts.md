---
id: epic-foreign-plugin-model-domain-contracts
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-foreign-plugin-model
depends_on: []
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Canonical Foreign Plugin Contracts

## Brief

Establish the TypeScript 7, ESM, Node.js 24 package and validation foundation together with the canonical vocabulary used throughout foreign-plugin ingestion. The capability covers stable marketplace and plugin identities, source declarations and resolved sources, normalized component inventories, source claims, configuration metadata, and typed boundary errors. Runtime schemas validate unknown external values while downstream types derive from the same authoritative definitions.

This feature gives every reader, materializer, and compatibility evaluator one host-independent contract with precise provenance. It does not parse a Claude or Codex catalog, acquire source content, inspect plugin files, or decide compatibility; those capabilities consume these contracts in later features.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: foundation capability — every other child feature depends directly or transitively on its canonical contracts
- Design alignment: preserve standalone operation, canonical `<plugin-name>@<marketplace-name>` identity, provenance-rich normalized claims, and fail-fast boundary validation from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Runtime and distribution; Plugin identity; Component compatibility verdicts
- `docs/ARCHITECTURE.md` — Package shape; Domain model; Error model
- `docs/COMPATIBILITY.md` — Verdict terminology; Marketplace discovery; Plugin source forms

<!-- The feature-design pass will fill in interfaces, signatures, and implementation units. -->
