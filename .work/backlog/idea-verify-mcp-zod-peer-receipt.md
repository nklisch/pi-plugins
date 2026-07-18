---
id: idea-verify-mcp-zod-peer-receipt
kind: story
stage: backlog
tags: [compatibility, cleanup]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Verify the MCP package zod peer in its receipt

The production MCP receipt verifies the Pi peer but not the published package's `zod` peer range. The current host satisfies `^3.25.0 || ^4.0.0`, and the programmatic entry bundles its own validation code, so this is not a current release blocker. Add explicit peer verification during the final cleanup phase without weakening fail-closed package qualification.
