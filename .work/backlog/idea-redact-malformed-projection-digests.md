---
id: idea-redact-malformed-projection-digests
created: 2026-07-16
updated: 2026-07-16
tags: [compatibility]
---

Keep malformed optional digest parsing inside the MCP projection boundary's redacting guard. The standard review observed that optional digest parsing currently occurs outside that guard; this is deferred because callers should not supply malformed branded digests and the accepted projection-evidence blockers take priority.
