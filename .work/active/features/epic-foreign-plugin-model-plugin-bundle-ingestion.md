---
id: epic-foreign-plugin-model-plugin-bundle-ingestion
kind: feature
stage: drafting
tags: [compatibility]
parent: epic-foreign-plugin-model
depends_on: [epic-foreign-plugin-model-source-materialization, epic-foreign-plugin-model-marketplace-ingestion]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Normalized Plugin Bundle Ingestion

## Brief

Inspect a materialized plugin selected from a normalized marketplace entry and produce one complete provenance-rich bundle. The capability reads Claude and Codex manifests, explicit and conventional component locations, marketplace-level declarations, supporting `userConfig`, Agent Skills layouts and frontmatter, command-hook declarations, MCP declarations, and unsupported native components without activating or executing any content.

For dual-format plugins, equivalent claims deduplicate, complementary metadata combines, and conflicts identify both source locations and make the normalized bundle invalid. Explicit paths and conventional discovery remain contained within the plugin root. This feature owns parsing, discovery, claim reconciliation, and structural validation; compatibility policy and runtime-capability decisions remain in the reporting feature.

## Epic context

- Parent epic: `epic-foreign-plugin-model`
- Position in epic: convergence capability consuming secure materialized content and normalized marketplace intent
- Design alignment: preserve dual-manifest conflict behavior, complete inventory, Agent Skills validation, provenance, and fail-closed unknown runtime declarations from the parent epic's `## Design decisions`

## Foundation references

- `docs/SPEC.md` — Manifests; Supporting plugin configuration; Skills; Hooks; MCP servers
- `docs/ARCHITECTURE.md` — Format ingestion; Conventional discovery; Normalized bundle
- `docs/COMPATIBILITY.md` — Plugin manifests; Supporting plugin configuration; Skills; Hook handlers; MCP configuration shapes

<!-- The feature-design pass will fill in interfaces, signatures, and implementation units. -->
