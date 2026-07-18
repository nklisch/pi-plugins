---
id: gate-docs-mcp-alias-current
kind: story
stage: done
tags: [documentation]
parent: null
depends_on: []
release_binding: 0.1.0
gate_origin: docs
created: 2026-07-18
updated: 2026-07-18
---

# Correct production MCP alias claims

State that canonical scoped MCP access is available but the maintained runtime cannot expose foreign compatibility aliases. Alias mappings are omitted with `RUNTIME_ALIAS_UNAVAILABLE`; make the compatibility matcher row conditional rather than current production truth.

## Implementation notes
- Execution capability: inline prose; both stale assertions were in one compatibility section.
- Review weight: bounded inline review, per caller override; no fresh-context or cross-model review.
- Files changed: `docs/COMPATIBILITY.md`.
- Tests added/removed: none; existing projection and production E2E tests assert the status code and canonical access.
- Simplification: replaced unconditional alias promises with one current runtime statement and one conditional matcher row.
- Discrepancies from design: none.
- Adjacent issues parked: none.

## Verification evidence
- Cross-checked `pluginToolAliases: false` handling and omission code against `src/application/mcp-plugin-projection.ts` and runtime participant qualification.
- Cross-checked canonical MCP use plus alias omission against the golden, presentation/security, and final packed production E2E corpus.
- Exact canonical-access, conditional-row, stale-phrase rejection, and `RUNTIME_ALIAS_UNAVAILABLE` greps passed with `git diff --check`.
- Bounded inline review confirmed no remaining unconditional production alias promise in the touched compatibility sections.
