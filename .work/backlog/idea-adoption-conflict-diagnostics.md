---
id: idea-adoption-conflict-diagnostics
created: 2026-07-16
updated: 2026-07-16
tags: [compatibility]
---

Improve foreign-state adoption diagnostics for three-or-more conflicting source declarations at one host/document/path/alias. The reconciler correctly omits every conflicting declaration today, but reports provenance for only the first conflicting pair (`src/domain/adoption.ts`). This is below the current-cycle blocker bar because authority and correctness remain fail-closed; richer details would make operator diagnosis more complete.
