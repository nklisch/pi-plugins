---
id: gate-cruft-decide-mcp-alias-resolver
kind: story
stage: backlog
tags: [cleanup]
parent: null
depends_on: []
release_binding: null
gate_origin: cruft
created: 2026-07-18
updated: 2026-07-18
---

# Decide the future of the unconnected MCP alias resolver

The post-discovery alias resolver has test-only consumers while production truthfully reports aliases unavailable. Decide whether to retain it as near-term contract groundwork or remove the module and alias-only tests; do not weaken collision guarantees implicitly.
