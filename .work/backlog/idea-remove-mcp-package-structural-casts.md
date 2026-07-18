---
id: idea-remove-mcp-package-structural-casts
kind: story
stage: backlog
tags: [cleanup, compatibility]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Remove MCP package structural casts

The production wrapper uses targeted `as unknown as Package*` casts at the package boundary. Runtime schemas and unchanged behavioral conformance currently fail closed on drift, so defer this cleanup until the final phase. Prefer an explicit typed package projection without weakening package replaceability.
