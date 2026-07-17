---
id: idea-snapshot-only-requested-mcp-environment
created: 2026-07-17
updated: 2026-07-16
tags: [security, cleanup]
---

Change the Node MCP launch environment adapter to retain only explicitly requested environment values for each callback rather than snapshotting all of `process.env` for the host session. Preserve callback consistency while shortening the lifetime of unrelated ambient secrets.
