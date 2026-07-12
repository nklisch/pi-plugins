---
id: epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-identity-source-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-11
---

# Provenance and Plugin Inventory Contracts

## Scope

Implement Unit 3 from the parent feature: source locations and per-value `Claimed<T>` provenance, plugin configuration descriptors, registry-backed normalized skill/hook/MCP/foreign component inventory, retained metadata, and the normalized plugin schema. Format-specific Claude/Codex schemas and compatibility verdict policy are outside this story.

## Files

- `src/domain/provenance.ts`
- `src/domain/configuration.ts`
- `src/domain/components.ts`
- `src/domain/plugin.ts`
- `test/domain/provenance.test.ts`
- `test/domain/configuration.test.ts`
- `test/domain/components.test.ts`
- `test/domain/plugin.test.ts`

Use the exact schemas and signatures in the parent design. Every schema-owned public type derives through `z.infer`. Configuration is a descriptor only and cannot hold configured or secret values. Unknown runtime declarations are retained as provenance-rich `foreign` components for later policy assessment.

## Acceptance criteria

- [ ] Every claimed value has non-empty provenance, equivalent merges retain both sources, and differing merges throw a typed conflict.
- [ ] Configuration rejects duplicate keys, inconsistent bounds/defaults, invalid keys, and value-bearing secret state.
- [ ] Component ids are unique across all inventory arrays and variants derive from the authoritative registries/schemas.
- [ ] Unknown runtime declarations remain inspectable without assigning a compatibility verdict in a reader contract.
- [ ] `NormalizedPluginSchema.parse` validates a full representative bundle and its public type is inferred from the schema.
- [ ] `npm test` and `npm run build` pass.
