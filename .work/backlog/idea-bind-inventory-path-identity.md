---
id: idea-bind-inventory-path-identity
created: 2026-07-17
updated: 2026-07-16
tags: [security, reliability]
---

Harden lifecycle inventory discovery by rejecting symlink candidates and binding every read-only SQLite inventory path to durable file identity before opening it. Reuse the identity-bound database conventions without changing inventory authority.
