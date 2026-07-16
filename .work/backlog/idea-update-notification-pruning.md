---
id: idea-update-notification-pruning
created: 2026-07-16
updated: 2026-07-16
tags: [cleanup, infra]
---

Prune durable update-notification memory for plugins removed from a successfully and completely refreshed marketplace catalog. Current stale markers are inert and do not affect authority, activation, or delivery, so this remains below the current-cycle blocker bar. Any future cleanup must run only with complete inventory/catalog evidence and preserve markers across transient or partial failures.
