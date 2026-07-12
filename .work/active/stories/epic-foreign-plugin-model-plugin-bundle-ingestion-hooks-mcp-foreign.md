---
id: epic-foreign-plugin-model-plugin-bundle-ingestion-hooks-mcp-foreign
kind: story
stage: implementing
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

- [ ] Real agile-workflow hooks normalize exact event, matcher, command, and timeout claims without command execution or verdicts.
- [ ] Structurally valid shell/exec command handlers become hook components; unsupported handler/runtime constructs become foreign inventory; malformed known shapes fail.
- [ ] Claude wrapped, Codex wrapped, documented direct-map, and inline MCP shapes preserve complete JSON, native key, host shape, and provenance.
- [ ] MCP readers do not classify transport/auth/capabilities, expand placeholders, read environment, contact servers, or produce projections.
- [ ] Equivalent hooks/MCP declarations derive stable ids and merge provenance; contradictory same logical identities fail with both claims.
- [ ] Foreign declarations produce valid `ForeignComponent` input with no verdict, requirement, activatability, or unsupported-status diagnostic.
- [ ] Format dependency boundaries and full `npm test` pass.

## Out of scope

No event/tool mapping, hook execution, MCP runtime integration, compatibility verdicts, runtime requirements, activation, or lifecycle behavior.
