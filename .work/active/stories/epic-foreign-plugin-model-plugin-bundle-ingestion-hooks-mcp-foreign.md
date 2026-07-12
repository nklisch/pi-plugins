---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign
kind: story
stage: review
tags: [compatibility]
parent: epic-foreign-plugin-model-plugin-bundle-ingestion
depends_on: [epic-foreign-plugin-model-plugin-bundle-ingestion-manifest-reconciliation]
release_binding: null
gate_origin: null
research_refs: []
research_origin: null
created: 2026-07-12
updated: 2026-07-12
---

# Read hook, MCP, and unsupported runtime declarations

## Scope

Implement Unit 4 from the parent feature design: pure Claude/Codex hook readers, pure MCP shape readers, and normalized foreign-declaration construction. These readers validate structure and retain semantics; they do not judge runtime compatibility.

Use the real agile-workflow hook document as a hermetic fixture and independent fixtures for MCP and unsupported declarations absent from `/home/nathan/dev/skills`.

## Files

- `src/formats/hook-reader-support.ts`
- `src/formats/claude/hook-reader.ts`
- `src/formats/codex/hook-reader.ts`
- `src/formats/mcp-reader-support.ts`
- `src/formats/claude/mcp-reader.ts`
- `src/formats/codex/mcp-reader.ts`
- `src/formats/foreign-declaration.ts`
- `test/fixtures/plugins/hooks/`
- `test/fixtures/plugins/mcp/`
- matching tests

## Acceptance criteria

- [x] Real agile-workflow hooks normalize exact event, matcher, command, and timeout claims without command execution or verdicts.
- [x] Structurally valid shell/exec command handlers become hook components; unsupported handler/runtime constructs become foreign inventory; malformed known shapes fail.
- [x] Claude wrapped, Codex wrapped, documented direct-map, and inline MCP shapes preserve complete JSON, native key, host shape, and provenance.
- [x] MCP readers do not classify transport/auth/capabilities, expand placeholders, read environment, contact servers, or produce projections.
- [x] Equivalent hooks/MCP declarations derive stable ids and merge provenance; contradictory same logical identities fail with both claims.
- [x] Foreign declarations produce valid `ForeignComponent` input with no verdict, requirement, activatability, or unsupported-status diagnostic.
- [x] Format dependency boundaries and full `npm test` pass.

## Implementation notes
- Execution capability: inline implementation; the format readers are cohesive pure adapters with shared support and no filesystem/runtime ownership.
- Review weight: standard, caller requested the implementation boundary at `stage:review`.
- Files changed: `src/formats/hook-reader-support.ts`, `src/formats/claude/hook-reader.ts`, `src/formats/codex/hook-reader.ts`, `src/formats/mcp-reader-support.ts`, `src/formats/claude/mcp-reader.ts`, `src/formats/codex/mcp-reader.ts`, `src/formats/foreign-declaration.ts`, `src/formats/stable-component-id.ts`, hermetic hook/MCP fixtures, and matching format tests.
- Tests added: pure Claude/Codex hook normalization, unsupported handler retention, hook identity/provenance/conflict behavior, Claude/Codex/direct/inline MCP shapes, opaque declaration preservation, MCP identity/provenance conflict behavior, and foreign declaration/component validation.
- Discrepancies from design: `stable-component-id.ts` supplies the pure SHA-256 adapter needed by synchronous format readers to emit the existing v1 component contract; the application can still re-derive ids through its injected hash port.
- Adjacent issues parked: none.
- Verification: `npm test`; independent `npm run build && node test/compiled-package-import.mjs`.

## Out of scope

No event/tool mapping, hook execution, MCP runtime integration, compatibility verdicts, runtime requirements, activation, or lifecycle behavior.
