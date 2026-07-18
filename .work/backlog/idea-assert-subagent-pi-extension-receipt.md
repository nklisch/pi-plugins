---
id: idea-assert-subagent-pi-extension-receipt
kind: story
stage: backlog
tags: [testing, compatibility]
parent: null
depends_on: []
created: 2026-07-18
updated: 2026-07-17
---

# Assert the subagent Pi extension receipt directly

Runtime receipt verification and production E2E already fail closed if `pi.extensions` drifts, but the focused package-receipt test does not assert the field directly. Add the focused assertion during final test cleanup for faster diagnosis.
