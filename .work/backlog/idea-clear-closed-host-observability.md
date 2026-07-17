---
id: idea-clear-closed-host-observability
created: 2026-07-17
updated: 2026-07-16
tags: [cleanup, reliability]
---

Ensure directly closing a `StartedPackagedPluginHost` clears or invalidates `host.current()` so callers cannot observe a closed application container. Preserve idempotent shutdown and successor handoff behavior.
