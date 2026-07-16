---
id: epic-mcp-runtime-integration-plugin-projections
kind: feature
stage: drafting
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration
depends_on: [epic-mcp-runtime-integration-config-source-bridge]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Plugin MCP Projections, Identity, and Aliases

## Brief

Translate the compatibility-approved MCP inventory in an exact `PluginRuntimeProjection` into a deterministic plugin-scoped MCP configuration source. The result preserves native declaration provenance, derives collision-free source/server identities from scope and plugin authority, carries unexpanded logical content/data/configuration references, and gives runtime inspection and removal the same stable keys used at registration.

The capability also derives faithful foreign MCP tool aliases where the selected runtime can expose them without collision, while leaving Pi-native discovery intact. Claude and Codex wrapper differences have already terminated at the foreign-model boundary: this feature consumes `McpServerComponent` and `CompatibilityReport`, and must derive from or mechanically cross-check `CompatibilityPolicyRegistry` rather than creating a second transport, authentication, field, or alias acceptance vocabulary.

This feature does not reread manifests or `.mcp.json`, alter foreign-format authority, access secrets, launch processes or remote connections, mutate lifecycle state, call reload, or render runtime status. It builds replaceable adapter inputs and safe provenance/status identities only.

## Epic context

- Parent epic: `epic-mcp-runtime-integration`
- Position in epic: projection capability consuming the completed configuration-source bridge; it can proceed in parallel with launch-context delivery
- Depends on: `epic-mcp-runtime-integration-config-source-bridge`
- Design alignment: preserve the parent epic's foreign-model boundary, source identity, provenance, alias, secret-timing, and removal decisions

## Boundary guardrails

- Existing `McpServerComponent` values and their compatibility assessments are the only foreign declaration inputs; no reader, merger, catalog, or manifest responsibility moves here.
- Runtime source descriptors remain deterministic, scope-qualified, revision/projection-bound, and free of physical roots, expanded configured values, secret material, and live connection state.
- Plugin identity plus native server key drives server namespacing. Tool aliases are derived compatibility views and never authority for registration, status, or deletion.
- Provenance survives into safe inspection/status evidence so similarly named servers remain attributable to their exact plugin and declaration.
- Unknown or no-longer-supported runtime shapes fail projection rather than bypassing the complete-bundle compatibility decision.

## Simplification opportunity

- Consolidate server naming, source keys, foreign aliases, status attribution, and removal identity around the existing plugin/component authorities.
- Avoid separate Claude, Codex, Pi, status, and deletion registries for the same server set.
- Keep generated runtime source objects replaceable; do not persist them or introduce an MCP-specific active-state store.

## Foundation references

- `docs/VISION.md` — Whole-plugin lifecycle; Honest compatibility
- `docs/SPEC.md` — MCP servers; Plugin identity; State contract
- `docs/ARCHITECTURE.md` — MCP adapter; Runtime projections; Derived runtime projections
- `docs/COMPATIBILITY.md` — MCP configuration shapes; MCP identity and tool names; Whole-plugin behavior

## UI alignment

No UI surface and no mockups. Provenance and status identities are data for the native manager owned by `epic-native-plugin-management`.

<!-- The feature-design pass will fill in interfaces, signatures, implementation units, and verification. -->
