---
id: epic-mcp-runtime-integration-plugin-projections-source-projection
kind: story
stage: implementing
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-plugin-projections
depends_on: [epic-mcp-runtime-integration-plugin-projections-policy-plan, epic-mcp-runtime-integration-plugin-projections-alias-contract]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-16
---

# Build the Deterministic Complete-Plugin MCP Projection

## Checkpoint

Implement the pure schema-derived projection from an exact `PluginRuntimeProjection`, matching `CompatibilityReport`, complete portable runtime capabilities, and injected SHA-256 into either a non-empty plugin-scoped `McpConfigSource` or an explicit digest-bound no-MCP result.

## Files

- `src/application/mcp-plugin-projection.ts`
- `src/index.ts`
- `test/application/mcp-plugin-projection.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Contract

Implement the parent design's:

- `PluginMcpLaunchTemplateSchemaV1`
- alias omission schemas
- `PluginMcpProjectionSchemaV1` (`none | source`)
- `deriveMcpRuntimeServerKey(componentId)`
- `createPluginMcpProjection(...)`
- `verifyPluginMcpProjection(...)`

Source ownership is exactly `scope + plugin + revision + complete projection digest`. Runtime server authority is that source identity plus `mcp-server-v1:<component digest>`. Native names remain display/alias values only.

Before output, verify the complete projection digest, report/plugin identity, activatability, exact supported MCP id set, component id derivation, plan support, plan-derived requirement ids, and available report requirements. Fail with a redacted domain error containing stable ids/codes only.

`launchTemplate` carries component id plus logical content/data/configuration references only. It never carries physical roots, command, args, cwd, env values, URL, headers, bearer/OAuth values, expanded placeholders, or live state.

## Acceptance evidence

- [ ] Equivalent reordered inputs produce identical canonical serialization and contribution digest.
- [ ] No-MCP input returns `kind: none` without constructing or registering an empty source.
- [ ] Same native key across plugins/scopes cannot collide; revision replacement retains the local server key and changes exact source/removal identity.
- [ ] Missing/extra/incompatible/stale report evidence and unsupported shapes fail before source publication.
- [ ] Provenance is sorted/deduplicated `SourceLocation` only; status/projection/error canaries reveal no declarations or launch values.
- [ ] Hostile Unicode/path-like/native names never become path, process, deletion, or global registration keys; aliases are exact or omitted, never normalized.

## Ordering and boundary

Depends on the policy plan and alias contract. Creation/verification are synchronous and pure. They do not call `McpRuntimePort`, resolve launch values, read files, launch/connect, mutate state, call reload, or persist projection output.
