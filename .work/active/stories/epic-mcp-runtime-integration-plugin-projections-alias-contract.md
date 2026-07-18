---
id: epic-mcp-runtime-integration-plugin-projections-alias-contract
kind: story
stage: done
tags: [compatibility, infra]
parent: epic-mcp-runtime-integration-plugin-projections
depends_on: [epic-mcp-runtime-integration-plugin-projections-policy-plan]
release_binding: 0.1.0
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-16
updated: 2026-07-18
---

# Align Tool Aliases with the Portable MCP Source Contract

## Checkpoint

Extend the package-neutral MCP contract with exact runtime server keys, safe native-key status metadata, strict Claude alias templates, and the optional `pluginToolAliases` runtime fact. Add one pure post-discovery collision resolver and update the existing fake/conformance suite in place.

## Files

- `src/application/ports/mcp-runtime.ts`
- `src/application/mcp-tool-aliases.ts`
- `src/index.ts`
- `test/application/mcp-runtime-contract.test.ts`
- `test/application/mcp-tool-aliases.test.ts`
- `test/support/fakes/mcp-runtime.ts`
- `test/support/fakes/mcp-runtime.test.ts`
- `test/contract/mcp-runtime.contract.ts`
- `test/contract/mcp-runtime.contract.test.ts`
- `test/integration/mcp-runtime-port.test.ts`
- `test/public-api.test.ts`
- `test/compiled-package-import.mjs`

## Contract

Add the exact schemas and fields from the parent design:

- `McpRuntimeServerKeySchemaV1`
- `McpToolAliasTemplateSchemaV1`
- `McpSourceServer.nativeKey`
- `McpSourceServer.toolAliases`
- `McpSourceServerStatus.nativeKey`
- `McpRuntimeCapabilities.features.pluginToolAliases`
- package-internal `resolveMcpToolAliases(...)`

Native discovery always wins and remains present. Exact duplicate alias claims collapse. A native-name collision, unrepresentable alias, or multiple distinct alias claimants exposes no alias. There is no insertion-order winner, suffixing, case folding, Unicode normalization, or marketplace precedence.

## Acceptance evidence

- [ ] Strict schemas reject malformed runtime keys, unknown alias fields, multiple templates, and any policy other than `omit-all` plus native preservation.
- [ ] Fake/conformance inspection retains exact source/server/component/native/provenance attribution and remains free of options, launch values, definitions, messages, and causes.
- [ ] Collision output is byte-identical across input permutations and keeps every native name discoverable.
- [ ] Unicode normalization pairs remain distinct; NUL/control/lone-surrogate or runtime-invalid candidates are omitted, never rewritten.
- [ ] `pluginToolAliases: false` is valid and does not change aggregate `pi.mcp.runtime` availability.

## Ordering and boundary

Depends on the shared policy plan so alias templates consume canonical server/transport evidence. This story remains package-neutral: no production adapter, Pi tool registration, process/connection behavior, file discovery, or availability claim.

## Implementation notes

- Extended the strict package-neutral source contract with opaque digest-derived server keys, exact native-key metadata, at-most-one Claude alias template, and the optional `pluginToolAliases` capability fact.
- Updated the reusable fake and conformance harness so validation, replacement, inspection, and status preserve exact source/component/native/provenance attribution while omitting options, launch templates, and aliases from status.
- Added the package-internal post-discovery resolver. Native names reserve exact spellings; exact duplicate claims collapse; every distinct claimant loses a contested alias; invalid Unicode/control/runtime names are omitted without rewriting.
- Public exports remain schema-derived and package-neutral. The resolver and fake/conformance symbols remain internal, and no production MCP package or availability claim was introduced.

## Verification

- `npm run typecheck` — passed.
- `npx vitest run test/public-api.test.ts test/application/mcp-runtime-contract.test.ts test/application/mcp-tool-aliases.test.ts test/support/fakes/mcp-runtime.test.ts test/contract/mcp-runtime.contract.test.ts test/integration/mcp-runtime-port.test.ts` — 6 files, 28 tests passed.
