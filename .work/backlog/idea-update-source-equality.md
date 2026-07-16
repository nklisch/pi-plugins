---
id: idea-update-source-equality
created: 2026-07-16
updated: 2026-07-16
tags: [refactor, infra]
---

Replace key-order-sensitive `JSON.stringify` equality in marketplace-source replacement with the canonical source serialization/equality contract. The current behavior is conservative—it can falsely reset automatic policy and refresh memory to manual, but cannot preserve authority across a real source change—so it is valid lower-priority cleanup rather than a completion blocker.
