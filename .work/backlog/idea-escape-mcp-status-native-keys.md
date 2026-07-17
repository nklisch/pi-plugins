---
id: idea-escape-mcp-status-native-keys
created: 2026-07-16
updated: 2026-07-16
tags: [compatibility]
---

Make native-manager MCP status rendering terminal-safe when a supported native server key contains control characters. Preserve the runtime and compatibility layer's existing native-key semantics; apply escaping only at the downstream native-manager presentation boundary.
