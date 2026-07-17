---
id: idea-cleanup-settled-pi-reload-broker-tickets
created: 2026-07-17
updated: 2026-07-16
tags: [cleanup, reliability]
---

Remove abort listeners on normal Pi reload-broker settlement and guarantee that abort followed by `fail()` cannot leave a settled ticket in the global broker map. Keep reload ordering and terminal handoff semantics unchanged.
