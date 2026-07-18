---
id: gate-docs-mcp-alias-current
kind: story
stage: implementing
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
