---
id: epic-foreign-plugin-model-domain-contracts-plugin-inventory-contracts
kind: story
stage: review
tags: [compatibility, infra]
parent: epic-foreign-plugin-model-domain-contracts
depends_on: [epic-foreign-plugin-model-domain-contracts-identity-source-contracts]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-11
updated: 2026-07-12
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

- [x] Every claimed value has non-empty provenance, equivalent merges retain both sources, and differing merges throw a typed conflict.
- [x] Configuration rejects duplicate keys, inconsistent bounds/defaults, invalid keys, and value-bearing secret state.
- [x] Component ids are unique across all inventory arrays and variants derive from the authoritative registries/schemas.
- [x] Unknown runtime declarations remain inspectable without assigning a compatibility verdict in a reader contract.
- [x] `NormalizedPluginSchema.parse` validates a full representative bundle and its public type is inferred from the schema.
- [x] `npm test` and `npm run build` pass.

## Implementation notes
- Files changed: `src/domain/provenance.ts`, `src/domain/configuration.ts`, `src/domain/components.ts`, `src/domain/plugin.ts`, and the four corresponding `test/domain/*.test.ts` files.
- Tests added: schema/type coverage for every provenance, configuration, hook/component, inventory, foreign declaration, and normalized-plugin contract; negative coverage for conflicts, duplicate ids/keys, malformed bounds, invalid keys, empty provenance, and secret/configured state.
- Discrepancies from design: `ClaimConflictError` is defined and exported from `provenance.ts` because this story's allowed files exclude the later `errors.ts` unit; the compatibility/error story can re-export or integrate this typed class without changing merge behavior. Configuration and component variant unions are generated from private schema registries while the public kind registries retain the exact designed `{ tag, label }` / `{ tag }` shapes.
- Adjacent issues parked: none.
- Dispatch rationale: direct-read implementation; the dependency and target files were explicit, and the completed identity/source contracts supplied the required patterns.
- Verification: `npm test` and `npm run build` pass.
